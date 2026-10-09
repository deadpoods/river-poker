import { summarizePlaystyle } from "../playstyle";
import type {
  Analytics,
  Profile,
  PublicRoom,
  Room,
  RoomSummary,
  Settings,
} from "../types";
import {
  createPlayer,
  createRoom,
  emptyActions,
  GameError,
  log,
  projectRoom,
  tick,
} from "../poker/engine";
import { database, ensureSchema } from "./db";

export async function insertRoom(
  profile: Profile,
  name: string,
  settings: Settings,
  practice: boolean,
) {
  await ensureSchema();
  const sql = database();
  for (let attempt = 0; attempt < 3; attempt++) {
    const room = createRoom(profile, name, settings, practice);
    try {
      await sql.begin(async (tx) => {
        await tx`INSERT INTO river_rooms (id, code, data) VALUES (${room.id}, ${room.code}, ${tx.json(room)})`;
        await tx`INSERT INTO river_members (room_id, profile_id) VALUES (${room.id}, ${profile.id})`;
      });
      return projectRoom(room, profile.id);
    } catch (e) {
      if ((e as { code?: string }).code !== "23505" || attempt === 2) throw e;
    }
  }
  throw new Error("Room code generation failed");
}

export async function withRoom<T>(
  code: string,
  profileId: string,
  mutate: (room: Room) => T | Promise<T>,
  options: { join?: boolean; heartbeat?: boolean; liveSnapshot?: boolean } = {},
) {
  if (!/^[A-Z2-9]{6}$/.test(code))
    throw new GameError("Enter a six-character room code.");
  await ensureSchema();
  const sql = database();
  return sql.begin(async (tx) => {
    // Live polling needs only the latest result. Keep the archive in Postgres
    // rather than transferring it to every connected player every 850 ms.
    // This mode is only used by the read-only snapshot callback below; game
    // actions (including startHand, which uses archive length) load full state.
    const rows = options.liveSnapshot
      ? await tx`SELECT (data - 'history') || jsonb_build_object('history',
          CASE WHEN jsonb_array_length(data->'history') > 0
          THEN jsonb_build_array(data->'history'->-1) ELSE '[]'::jsonb END) AS data
          FROM river_rooms WHERE code = ${code} FOR UPDATE`
      : await tx`SELECT data FROM river_rooms WHERE code = ${code} FOR UPDATE`;
    if (!rows.length)
      throw new GameError(
        "That table could not be found. Check your invitation code.",
        404,
      );
    const room = rows[0].data as Room;
    if (
      room.status !== "finished" &&
      Date.now() - room.updatedAt > 48 * 60 * 60 * 1000
    )
      throw new GameError(
        "This table has expired. Create a new room to play again.",
        410,
      );
    const player = room.players.find((p) => p.id === profileId);
    if (!player && !options.join)
      throw new GameError("Join the room with its invitation code first.", 403);
    const before = JSON.stringify(room);
    const previousHistoryLength = room.history.length;
    if (options.heartbeat && player && Date.now() - player.lastSeen > 8000)
      player.lastSeen = Date.now();
    tick(room);
    const result = await mutate(room);
    if (JSON.stringify(room) !== before) {
      room.version++;
      room.updatedAt = Date.now();
      if (options.liveSnapshot) {
        // tick may finish the current hand. Append its new result atomically
        // under the same row lock, preserving every older archived hand.
        const additions = room.history.slice(previousHistoryLength);
        await tx`UPDATE river_rooms SET data = (${tx.json(room)}::jsonb - 'history')
          || jsonb_build_object('history', (data->'history') || ${tx.json(additions)}::jsonb),
          updated_at = now() WHERE id = ${room.id}`;
      } else {
        await tx`UPDATE river_rooms SET data = ${tx.json(room)}, updated_at = now() WHERE id = ${room.id}`;
      }
      if (options.join)
        await tx`INSERT INTO river_members (room_id, profile_id) VALUES (${room.id}, ${profileId}) ON CONFLICT DO NOTHING`;
    }
    return result;
  });
}

export async function roomSnapshot(
  code: string,
  profileId: string,
  heartbeat = true,
  liveSnapshot = false,
): Promise<PublicRoom> {
  // Projection runs after the transaction updates its version.
  const room = await withRoom(code, profileId, (r) => r, { heartbeat, liveSnapshot });
  return projectRoom(room, profileId);
}

export async function liveRoomUpdate(
  code: string,
  profileId: string,
  version: number,
): Promise<PublicRoom | null> {
  if (!/^[A-Z2-9]{6}$/.test(code))
    throw new GameError("Enter a six-character room code.");
  await ensureSchema();
  const sql = database();
  // An unchanged table transfers only a few scalars. Do not cache shared state
  // in memory: every instance still sees committed actions and deadlines.
  const [state] = await sql`SELECT data->>'version' AS version,
    data->>'status' AS status, data->>'updatedAt' AS updated,
    (SELECT p->>'lastSeen' FROM jsonb_array_elements(data->'players') p
      WHERE p->>'id' = ${profileId}) AS seen,
    CASE WHEN data->>'status' = 'playing' AND data->'hand'->>'finishedAt' IS NULL
      THEN CASE WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(data->'players') p
        WHERE p->>'id' = data->'hand'->>'actor' AND p->>'bot' = 'true')
      THEN data->'hand'->>'botAt' ELSE data->'hand'->>'deadline' END
      ELSE NULL END AS due
    FROM river_rooms WHERE code = ${code}`;
  if (!state) throw new GameError("That table could not be found. Check your invitation code.", 404);
  if (state.seen === null) throw new GameError("Join the room with its invitation code first.", 403);
  const now = Date.now();
  if (state.status !== "finished" && now - Number(state.updated) > 48 * 60 * 60 * 1000)
    throw new GameError("This table has expired. Create a new room to play again.", 410);
  if (Number(state.version) === version && now - Number(state.seen) <= 8000
    && (state.due === null || now < Number(state.due))) return null;
  return roomSnapshot(code, profileId, true, true);
}

export async function historySnapshot(
  code: string,
  profileId: string,
): Promise<PublicRoom> {
  await ensureSchema();
  const sql = database();
  // Former players retain their own history after leaving the live table.
  const rows =
    await sql`SELECT r.data FROM river_rooms r JOIN river_members m ON m.room_id = r.id
    WHERE r.code = ${code} AND m.profile_id = ${profileId}`;
  if (!rows.length)
    throw new GameError("This session is not part of your history.", 404);
  return projectRoom(rows[0].data as Room, profileId, Date.now(), true);
}

export async function joinRoom(code: string, profile: Profile) {
  const room = await withRoom(
    code,
    profile.id,
    (r) => {
      const existing = r.players.find((p) => p.id === profile.id);
      if (existing) {
        existing.lastSeen = Date.now();
        existing.name = profile.name;
        existing.color = profile.color;
        return r;
      }
      if (r.practice)
        throw new GameError(
          "Practice tables are just for you. Create a private room to invite friends.",
          403,
        );
      if (r.status !== "lobby")
        throw new GameError(
          "This session has already started. Ask the host to open a new table.",
          409,
        );
      if (r.players.length >= r.settings.maxPlayers)
        throw new GameError("This table is full.", 409);
      r.players.push(createPlayer(profile, r.settings.startingStack));
      log(r, "join", `${profile.name} took a seat`, profile.id);
      return r;
    },
    { join: true },
  );
  return projectRoom(room, profile.id);
}

export async function memberRooms(profileId: string): Promise<Room[]> {
  await ensureSchema();
  const sql = database();
  const rows =
    await sql`SELECT r.data FROM river_rooms r JOIN river_members m ON m.room_id = r.id
    WHERE m.profile_id = ${profileId} ORDER BY r.updated_at DESC`;
  return rows.map((r) => r.data as Room);
}

export function summarize(room: Room, profileId: string): RoomSummary {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    practice: room.practice,
    status: room.status,
    players: room.players.length,
    maxPlayers: room.settings.maxPlayers,
    hands: room.history.length,
    createdAt: room.createdAt,
    startedAt: room.startedAt,
    endedAt: room.endedAt,
    host: room.hostId === profileId,
    smallBlind: room.settings.smallBlind,
    net: room.history.reduce(
      (n, h) => n + (h.players.find((p) => p.id === profileId)?.net || 0),
      0,
    ),
  };
}

export function analytics(
  rooms: Room[],
  profileId: string,
  practice?: boolean,
): Analytics {
  const selected = rooms.filter(
    (r) => practice === undefined || r.practice === practice,
  );
  const records = selected
    .flatMap((r) =>
      r.history.map((h) => ({
        hand: h,
        self: h.players.find((p) => p.id === profileId),
      })),
    )
    .filter((r) => r.self)
    .sort((a, b) => a.hand.endedAt - b.hand.endedAt);
  const wins = records.filter((r) => r.self!.won > 0).length;
  const actions = emptyActions();
  let running = 0;
  const trend = records.map((r, i) => {
    running += r.self!.net;
    return { hand: i + 1, net: running };
  });
  for (const r of records)
    for (const kind of Object.keys(actions) as (keyof typeof actions)[])
      actions[kind] += r.self!.actions[kind];
  const sessions = selected.filter(
    (r) =>
      r.startedAt &&
      (r.players.some((p) => p.id === profileId) ||
        r.history.some((h) => h.players.some((p) => p.id === profileId))),
  );
  return {
    playstyle: summarizePlaystyle(records.map(r => r.hand), profileId),
    hands: records.length,
    wins,
    losses: records.length - wins,
    winRate: records.length ? (wins / records.length) * 100 : 0,
    averagePot: records.length
      ? records.reduce((a, r) => a + r.hand.pot, 0) / records.length
      : 0,
    totalDecisions: Object.values(actions).reduce((a, n) => a + n, 0),
    actions,
    net: running,
    sessions: sessions.length,
    averageSessionMinutes: sessions.length
      ? sessions.reduce(
          (a, r) => a + ((r.endedAt || Date.now()) - r.startedAt!) / 60000,
          0,
        ) / sessions.length
      : 0,
    showdowns: records.filter((r) => r.self!.showdown).length,
    showdownWins: records.filter((r) => r.self!.showdown && r.self!.won > 0)
      .length,
    aggression: actions.call ? actions.raise / actions.call : null,
    assistantUses: records.reduce((a, r) => a + r.self!.assistantUses, 0),
    trend: trend.slice(-100),
  };
}
