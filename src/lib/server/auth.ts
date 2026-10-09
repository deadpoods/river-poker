import { randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { Profile } from "../types";
import { GameError } from "../poker/engine";
import { database, ensureSchema } from "./db";
import { hash } from "./http";

export async function findProfile(): Promise<Profile | null> {
  const token = (await cookies()).get("river_session")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  await ensureSchema();
  const sql = database();
  const rows =
    await sql`SELECT p.data FROM river_sessions s JOIN river_profiles p ON p.id = s.profile_id
    WHERE s.token_hash = ${hash(token)} AND s.expires_at > now()`;
  return (rows[0]?.data as Profile) || null;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await findProfile();
  if (!profile)
    throw new GameError(
      "Your seat has expired. Please refresh to sign in again.",
      401,
    );
  return profile;
}

export async function createProfile(name = "Alex"): Promise<Profile> {
  await ensureSchema();
  const profile: Profile = {
    id: randomUUID(),
    name,
    color: "blue",
    createdAt: Date.now(),
    preferences: { assistant: true, sound: false, reducedMotion: false },
  };
  const sql = database();
  await sql`INSERT INTO river_profiles (id, data) VALUES (${profile.id}, ${sql.json(profile)})`;
  return profile;
}

export async function setSession(profileId: string, request: Request) {
  const token = randomBytes(32).toString("hex");
  const sql = database();
  await sql`INSERT INTO river_sessions (token_hash, profile_id, expires_at)
    VALUES (${hash(token)}, ${profileId}, now() + interval '365 days')`;
  (await cookies()).set("river_session", token, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
}
