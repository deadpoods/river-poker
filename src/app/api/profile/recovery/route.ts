import { randomBytes } from "node:crypto";
import { requireProfile } from "@/lib/server/auth";
import { database } from "@/lib/server/db";
import { checkOrigin, failure, hash, json } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const profile = await requireProfile();
    const key = randomBytes(24).toString("base64url");
    const sql = database();
    await sql`UPDATE river_profiles SET recovery_hash = ${hash(key)} WHERE id = ${profile.id}`;
    return json({ key });
  } catch (e) {
    return failure(e);
  }
}
