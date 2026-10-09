import { requireProfile } from "@/lib/server/auth";
import { analytics, memberRooms } from "@/lib/server/rooms";
import { failure, json } from "@/lib/server/http";

export async function GET(request: Request) {
  try {
    const profile = await requireProfile();
    const mode = new URL(request.url).searchParams.get("mode");
    return json({
      stats: analytics(
        await memberRooms(profile.id),
        profile.id,
        mode === "friends" ? false : mode === "practice" ? true : undefined,
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
