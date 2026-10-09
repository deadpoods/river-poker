import { requireProfile } from "@/lib/server/auth";
import { withRoom } from "@/lib/server/rooms";
import { calculateAssistant } from "@/lib/poker/assistant";
import { failure, json } from "@/lib/server/http";
import { GameError } from "@/lib/poker/engine";
import { rateLimit } from "@/lib/server/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const profile = await requireProfile();
    const { code } = await context.params;
    if (!profile.preferences.assistant)
      throw new GameError("Enable the assistant in your preferences.", 403);
    if (!(await rateLimit(`assistant:${profile.id}`, 80, 60)))
      throw new GameError("Give the assistant a moment to finish.", 429);
    const room = await withRoom(code, profile.id, (r) => {
      const self = r.players.find((p) => p.id === profile.id)!;
      if (r.hand && !r.hand.finishedAt) self.assistantUses++;
      return structuredClone(r);
    });
    return json({
      assistant: calculateAssistant(room, profile.id),
      handNumber: room.hand?.number,
      street: room.hand?.street,
    });
  } catch (e) {
    return failure(e);
  }
}
