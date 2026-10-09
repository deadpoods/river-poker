import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRoom, createPlayer, startHand, act } from "../src/lib/poker/engine";
import { database, ensureSchema } from "../src/lib/server/db";
import { roomSnapshot, historySnapshot, liveRoomUpdate } from "../src/lib/server/rooms";
import type { Profile } from "../src/lib/types";

test("compact live snapshots preserve archives, privacy, concurrent heartbeats and exactly-once timeout results", async () => {
  const directory = await mkdtemp(join(tmpdir(), "river-live-"));
  process.env.DATABASE_URL = "";
  process.env.RIVER_LOCAL_DATABASE = "1";
  process.env.RIVER_DATA_DIR = directory;
  const profile: Profile = { id: "host", name: "Host", color: "blue", createdAt: 1, preferences: { sound: true, assistant: true, reducedMotion: false } };
  const guest = { ...profile, id: "guest", name: "Guest" };
  const room = createRoom(profile, "Archive regression", { maxPlayers: 2, startingStack: 1000, smallBlind: 10, turnSeconds: 30 }, false);
  room.players.push(createPlayer(guest, 1000));
  const now = Date.now();
  startHand(room, now - 200_000, "11223344");
  act(room, room.hand!.actor!, "fold", undefined, now - 199_000);
  const result = room.history[0];
  room.history = Array.from({ length: 250 }, (_, i) => ({ ...structuredClone(result), number: i + 1 }));
  const archive = JSON.parse(JSON.stringify(room.history));
  startHand(room, now, "11223344");
  const sql = database();
  try {
    await ensureSchema();
    for (const p of [profile, guest]) {
      await sql`INSERT INTO river_profiles (id, data) VALUES (${p.id}, ${sql.json(p)})`;
    }
    await sql`INSERT INTO river_rooms (id, code, data) VALUES (${room.id}, ${room.code}, ${sql.json(room)})`;
    for (const p of [profile, guest]) {
      await sql`INSERT INTO river_members (room_id, profile_id) VALUES (${room.id}, ${p.id})`;
    }
    const full = await roomSnapshot(room.code, profile.id, false);
    const live = await roomSnapshot(room.code, profile.id, true, true);
    assert.equal(live.history.length, 1);
    assert.equal(live.hand!.number, 251);
    assert.deepEqual(live.players.find(p => p.id === guest.id)!.cards, [null, null]);
    assert.ok(JSON.stringify(live).length < JSON.stringify(full).length / 10);
    assert.equal(await liveRoomUpdate(room.code, profile.id, live.version), null);
    assert.ok(await liveRoomUpdate(room.code, profile.id, live.version - 1));
    await assert.rejects(liveRoomUpdate(room.code, "stranger", live.version), /Join the room/);
    await assert.rejects(roomSnapshot(room.code, "stranger", true, true), /Join the room/);
    room.hand!.deadline = now - 1;
    room.players.forEach(p => { p.lastSeen = now - 20_000; });
    await sql`UPDATE river_rooms SET data = ${sql.json(room)} WHERE id = ${room.id}`;
    await Promise.all([liveRoomUpdate(room.code, profile.id, live.version), liveRoomUpdate(room.code, guest.id, live.version)]);
    const [stored] = await sql`SELECT data FROM river_rooms WHERE id = ${room.id}`;
    assert.deepEqual(stored.data.history.slice(0, 250), archive);
    assert.equal(stored.data.history.length, 251);
    assert.equal(stored.data.history[250].number, 251);
    assert.ok(stored.data.players.every((p: {lastSeen: number}) => p.lastSeen >= now));
    const history = await historySnapshot(room.code, profile.id);
    assert.equal(history.history.length, 251);
    const again = await roomSnapshot(room.code, profile.id, false, true);
    assert.equal(again.history.length, 1);
    assert.equal((await historySnapshot(room.code, profile.id)).history.length, 251);
  } finally {
    await sql.end();
    await rm(directory, { recursive: true, force: true });
  }
});
