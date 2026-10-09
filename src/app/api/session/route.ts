import { createProfile, findProfile, setSession } from "@/lib/server/auth";
import { database, ensureSchema, rateLimit } from "@/lib/server/db";
import {
  body,
  checkOrigin,
  clientBucket,
  failure,
  hash,
  json,
  textInput,
} from "@/lib/server/http";
import { GameError } from "@/lib/poker/engine";
import type { Profile } from "@/lib/types";

export async function GET() {
  try {
    return json({ profile: await findProfile() });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const data = await body(request);
    const current = await findProfile();
    if (current && !data.recoveryKey) return json({ profile: current });
    if (!(await rateLimit(`session:${clientBucket(request)}`, 20, 3600)))
      throw new GameError(
        "Too many sign-in attempts. Please try again later.",
        429,
      );
    let profile: Profile;
    if (data.recoveryKey) {
      const key = textInput(data.recoveryKey, "Recovery key", 80).replace(
        /\s/g,
        "",
      );
      await ensureSchema();
      const sql = database();
      const rows =
        await sql`SELECT data FROM river_profiles WHERE recovery_hash = ${hash(key)}`;
      if (!rows.length)
        throw new GameError(
          "That recovery key is not valid. Check it and try again.",
          401,
        );
      profile = rows[0].data as Profile;
    } else
      profile = await createProfile(
        data.name ? textInput(data.name, "Name", 24) : "Alex",
      );
    await setSession(profile.id, request);
    return json({ profile });
  } catch (e) {
    return failure(e);
  }
}
