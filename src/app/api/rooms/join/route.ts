import { requireProfile } from "@/lib/server/auth";
import { joinRoom } from "@/lib/server/rooms";
import { body, checkOrigin, failure, json, textInput } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/db";
import { GameError } from "@/lib/poker/engine";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const profile = await requireProfile();
    const data = await body(request);
    if (!(await rateLimit(`join:${profile.id}`, 30, 60)))
      throw new GameError(
        "Please wait a minute before trying more room codes.",
        429,
      );
    const code = textInput(data.code, "Room code", 12)
      .replace(/\s/g, "")
      .toUpperCase();
    return json({ room: await joinRoom(code, profile) });
  } catch (e) {
    return failure(e);
  }
}
