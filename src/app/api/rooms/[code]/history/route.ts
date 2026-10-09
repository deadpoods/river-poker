import { requireProfile } from "@/lib/server/auth";
import { historySnapshot } from "@/lib/server/rooms";
import { failure, json } from "@/lib/server/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const profile = await requireProfile();
    const { code } = await context.params;
    return json({ room: await historySnapshot(code, profile.id) });
  } catch (e) {
    return failure(e);
  }
}
