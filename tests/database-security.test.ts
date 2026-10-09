import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { database, ensureSchema } from "../src/lib/server/db";

test("browser database roles cannot read or write profiles even with table grants", async () => {
  const directory = await mkdtemp(join(tmpdir(), "river-security-"));
  process.env.DATABASE_URL = "";
  process.env.RIVER_LOCAL_DATABASE = "1";
  process.env.RIVER_DATA_DIR = directory;
  const sql = database();
  try {
    await ensureSchema();
    await sql`INSERT INTO river_profiles (id, data) VALUES ('private-profile', '{"name":"Private player"}'::jsonb)`;
    await sql`CREATE ROLE river_untrusted`;
    await sql`GRANT USAGE ON SCHEMA public TO river_untrusted`;
    await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON river_profiles TO river_untrusted`;
    const visible = await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE river_untrusted`;
      return tx`SELECT id FROM river_profiles`;
    });
    assert.equal(visible.length, 0);
    await assert.rejects(sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE river_untrusted`;
      await tx`INSERT INTO river_profiles (id, data) VALUES ('intruder', '{}'::jsonb)`;
    }), /row-level security/);
    const profiles = await sql`SELECT id FROM river_profiles`;
    assert.deepEqual(profiles.map((row) => row.id), ["private-profile"]);
    const tables = await sql`SELECT relname, relrowsecurity FROM pg_class
      WHERE relname IN ('river_profiles', 'river_sessions', 'river_rooms', 'river_members', 'river_rate_limits')`;
    assert.equal(tables.length, 5);
    assert.ok(tables.every((row) => row.relrowsecurity));
  } finally {
    await sql.end();
    await rm(directory, { recursive: true, force: true });
  }
});
