import postgres from "postgres";
import { localDatabase } from "./local-db";

type GlobalDb = typeof globalThis & {
  riverSql?: ReturnType<typeof postgres>;
  riverSchema?: Promise<void>;
};
const cache = globalThis as GlobalDb;

export function database() {
  if (!process.env.DATABASE_URL) {
    if (
      !process.env.VERCEL &&
      (process.env.NODE_ENV === "development" ||
        process.env.RIVER_LOCAL_DATABASE === "1")
    ) {
      cache.riverSql ??= localDatabase();
      return cache.riverSql;
    }
    throw new Error("DATABASE_NOT_CONFIGURED");
  }
  if (!cache.riverSql)
    cache.riverSql = postgres(process.env.DATABASE_URL, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      ssl: process.env.DATABASE_URL.includes("localhost")
        ? false
        : process.env.DATABASE_SSL_CA
          ? {
              rejectUnauthorized: true,
              ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, "\n"),
            }
          : "verify-full",
    });
  return cache.riverSql;
}

export async function ensureSchema() {
  if (!cache.riverSchema) {
    cache.riverSchema = (async () => {
      const sql = database();
      // An advisory lock keeps concurrent cold starts from racing DDL.
      await sql.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(71833291)`;
        await tx`CREATE TABLE IF NOT EXISTS river_profiles (
          id text PRIMARY KEY, data jsonb NOT NULL, recovery_hash text UNIQUE
        )`;
        await tx`CREATE TABLE IF NOT EXISTS river_sessions (
          token_hash text PRIMARY KEY, profile_id text NOT NULL REFERENCES river_profiles(id),
          expires_at timestamptz NOT NULL
        )`;
        await tx`CREATE TABLE IF NOT EXISTS river_rooms (
          id text PRIMARY KEY, code varchar(6) UNIQUE NOT NULL, data jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )`;
        await tx`CREATE TABLE IF NOT EXISTS river_members (
          room_id text NOT NULL REFERENCES river_rooms(id),
          profile_id text NOT NULL REFERENCES river_profiles(id),
          PRIMARY KEY (room_id, profile_id)
        )`;
        await tx`CREATE INDEX IF NOT EXISTS river_members_profile_idx ON river_members(profile_id)`;
        await tx`CREATE TABLE IF NOT EXISTS river_rate_limits (
          bucket text PRIMARY KEY, hits integer NOT NULL, expires_at timestamptz NOT NULL
        )`;
        // Only the server's table owner may access data. Browser-facing
        // database roles have no policies; River authorizes requests in its API.
        await tx`ALTER TABLE river_profiles ENABLE ROW LEVEL SECURITY`;
        await tx`ALTER TABLE river_sessions ENABLE ROW LEVEL SECURITY`;
        await tx`ALTER TABLE river_rooms ENABLE ROW LEVEL SECURITY`;
        await tx`ALTER TABLE river_members ENABLE ROW LEVEL SECURITY`;
        await tx`ALTER TABLE river_rate_limits ENABLE ROW LEVEL SECURITY`;
      });
    })().catch((error) => {
      cache.riverSchema = undefined;
      throw error;
    });
  }
  return cache.riverSchema;
}

export async function rateLimit(
  bucket: string,
  maximum: number,
  windowSeconds: number,
) {
  await ensureSchema();
  const sql = database();
  const rows =
    await sql`INSERT INTO river_rate_limits (bucket, hits, expires_at)
    VALUES (${bucket}, 1, now() + ${windowSeconds} * interval '1 second')
    ON CONFLICT (bucket) DO UPDATE SET
      hits = CASE WHEN river_rate_limits.expires_at < now() THEN 1 ELSE river_rate_limits.hits + 1 END,
      expires_at = CASE WHEN river_rate_limits.expires_at < now() THEN now() + ${windowSeconds} * interval '1 second' ELSE river_rate_limits.expires_at END
    RETURNING hits`;
  return rows[0].hits <= maximum;
}
