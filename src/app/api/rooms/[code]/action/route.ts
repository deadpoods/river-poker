import { requireProfile } from "@/lib/server/auth";
import { withRoom } from "@/lib/server/rooms";
import { body, checkOrigin, failure, integer, json } from "@/lib/server/http";
import {
  act,
  createPlayer,
  finishSession,
  GameError,
  log,
  projectRoom,
  startHand,
} from "@/lib/poker/engine";
import { rateLimit } from "@/lib/server/db";
import type { ActionKind } from "@/lib/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    checkOrigin(request);
    const profile = await requireProfile();
    const { code } = await context.params;
    const data = await body(request);
    if (!(await rateLimit(`action:${profile.id}`, 120, 60)))
      throw new GameError("Too many actions. Please wait a moment.", 429);
    if (
      typeof data.requestId !== "string" ||
      !/^[a-f0-9-]{36}$/.test(data.requestId)
    )
      throw new GameError("An action ID is required.");
    const room = await withRoom(code, profile.id, (r) => {
      if (r.receipts.includes(data.requestId as string)) return r;
      const self = r.players.find((p) => p.id === profile.id)!;
      self.lastSeen = Date.now();
      self.name = profile.name;
      self.color = profile.color;
      const host = r.hostId === profile.id;
      if (data.type === "ready") {
        if (r.status !== "lobby")
          throw new GameError("The session has already started.", 409);
        self.ready = !self.ready;
        log(
          r,
          "ready",
          `${self.name} is ${self.ready ? "ready" : "taking a moment"}`,
          self.id,
        );
      } else if (data.type === "start") {
        if (!host)
          throw new GameError("Only the host can deal the first hand.", 403);
        if (r.status !== "lobby")
          throw new GameError("The session has already started.", 409);
        if (r.players.length < 2 || r.players.some((p) => !p.ready))
          throw new GameError(
            "At least two players need to be seated, and everyone must be ready.",
          );
        startHand(r);
      } else if (data.type === "next") {
        if (!host)
          throw new GameError("The host will deal the next hand.", 403);
        if (!r.hand?.finishedAt)
          throw new GameError("Finish this hand first.", 409);
        startHand(r);
      } else if (data.type === "end") {
        if (!host)
          throw new GameError("Only the host can end the session.", 403);
        finishSession(r);
      } else if (data.type === "settings") {
        if (!host)
          throw new GameError("Only the host can change table settings.", 403);
        if (r.status !== "lobby")
          throw new GameError(
            "Settings can be changed before the session starts.",
            409,
          );
        const raw = data.settings as Record<string, unknown>;
        if (!raw) throw new GameError("Choose valid settings.");
        const settings = {
          maxPlayers: integer(
            raw.maxPlayers,
            "Seats",
            Math.max(2, r.players.length),
            8,
          ),
          startingStack: integer(
            raw.startingStack,
            "Starting stack",
            500,
            50_000,
          ),
          smallBlind: integer(raw.smallBlind, "Small blind", 5, 1000),
          turnSeconds: integer(raw.turnSeconds, "Turn timer", 15, 90),
        };
        if (settings.startingStack < settings.smallBlind * 40)
          throw new GameError(
            "Starting stacks must be at least 20 big blinds.",
          );
        r.settings = settings;
        for (const p of r.players) {
          p.stack = settings.startingStack;
          if (!p.bot) p.ready = false;
        }
        log(r, "settings", "The host updated the table settings");
      } else if (data.type === "bot") {
        if (!host || !r.practice || r.status !== "lobby")
          throw new GameError(
            "Practice opponents can be added before a practice session.",
            403,
          );
        if (r.players.length >= r.settings.maxPlayers)
          throw new GameError("All seats are taken.");
        r.players.push(
          createPlayer(
            { id: `bot-${crypto.randomUUID()}`, name: "Sam", color: "sage" },
            r.settings.startingStack,
            true,
          ),
        );
      } else if (data.type === "leave") {
        if (r.hand && !r.hand.finishedAt)
          throw new GameError("You can sit out after this hand.");
        if (host)
          throw new GameError("End the session before leaving your table.");
        r.players = r.players.filter((p) => p.id !== profile.id);
        log(r, "leave", `${self.name} left the table`, self.id);
      } else if (data.type === "play") {
        if (
          data.handNumber !== r.hand?.number ||
          data.street !== r.hand?.street ||
          data.currentBet !== r.hand?.currentBet
        )
          throw new GameError(
            "The table moved on. Review the updated action and try again.",
            409,
          );
        act(
          r,
          profile.id,
          data.kind as ActionKind,
          data.raiseTo as number | undefined,
        );
      } else throw new GameError("Choose a valid table action.");
      r.receipts.push(data.requestId as string);
      r.receipts = r.receipts.slice(-200);
      return r;
    });
    // A removed player gets no subsequent table state.
    if (!room.players.some((p) => p.id === profile.id))
      return json({ left: true });
    return json({ room: projectRoom(room, profile.id) });
  } catch (e) {
    return failure(e);
  }
}
