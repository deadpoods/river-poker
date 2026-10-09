import { requireProfile } from "@/lib/server/auth";
import { memberRooms, summarize } from "@/lib/server/rooms";
import { failure, json } from "@/lib/server/http";

export async function GET() {
  try {
    const profile = await requireProfile();
    const rooms = await memberRooms(profile.id);
    return json({
      sessions: rooms
        .filter((r) => r.startedAt)
        .map((r) => ({
          ...summarize(r, profile.id),
          duration: ((r.endedAt || Date.now()) - r.startedAt!) / 60000,
          wins: r.history.filter((h) =>
            h.winners.some((p) => p.id === profile.id),
          ).length,
          biggestPot: Math.max(0, ...r.history.map((h) => h.pot)),
          opponents: r.players
            .filter((p) => p.id !== profile.id)
            .map((p) => ({ name: p.name, color: p.color, bot: p.bot })),
        })),
    });
  } catch (e) {
    return failure(e);
  }
}
