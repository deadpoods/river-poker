import { requireProfile } from "@/lib/server/auth";
import { insertRoom, memberRooms, summarize } from "@/lib/server/rooms";
import {
  body,
  checkOrigin,
  failure,
  integer,
  json,
  textInput,
} from "@/lib/server/http";
import { rateLimit } from "@/lib/server/db";
import { GameError } from "@/lib/poker/engine";

export async function GET() {
  try {
    const profile = await requireProfile();
    return json({
      rooms: (await memberRooms(profile.id))
        .filter((r) => r.players.some((p) => p.id === profile.id))
        .map((r) => summarize(r, profile.id)),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const profile = await requireProfile();
    const data = await body(request);
    if (!(await rateLimit(`room:${profile.id}`, 30, 3600)))
      throw new GameError(
        "You have opened a lot of tables. Please try again in an hour.",
        429,
      );
    const name = textInput(data.name, "Table name", 36);
    const raw = data.settings as Record<string, unknown>;
    if (!raw || typeof raw !== "object")
      throw new GameError("Choose your table settings.");
    const settings = {
      maxPlayers: integer(raw.maxPlayers, "Seats", 2, 8),
      startingStack: integer(raw.startingStack, "Starting stack", 500, 50_000),
      smallBlind: integer(raw.smallBlind, "Small blind", 5, 1000),
      turnSeconds: integer(raw.turnSeconds, "Turn timer", 15, 90),
    };
    if (settings.startingStack < settings.smallBlind * 40)
      throw new GameError("Choose a starting stack of at least 20 big blinds.");
    return json(
      {
        room: await insertRoom(profile, name, settings, data.practice === true),
      },
      201,
    );
  } catch (e) {
    return failure(e);
  }
}
