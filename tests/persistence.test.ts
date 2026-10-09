import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { localDatabase } from "../src/lib/server/local-db";

test("development PostgreSQL persists JSON, rolls back failures, and serializes concurrent transactions", async () => {
  const directory = await mkdtemp(join(tmpdir(), "river-persistence-"));
  process.env.RIVER_DATA_DIR = directory;
  let sql = localDatabase();
  try {
    await sql`CREATE TABLE persistence_check (id text PRIMARY KEY, data jsonb, count integer NOT NULL)`;
    const payload = {
      name: "A player's table",
      cards: [{ rank: 14, suit: "s" }],
    };
    await sql`INSERT INTO persistence_check VALUES ('room', ${sql.json(payload)}, 0)`;
    await assert.rejects(
      sql.begin(async (tx) => {
        await tx`UPDATE persistence_check SET count = 999 WHERE id = 'room'`;
        throw new Error("rollback");
      }),
      /rollback/,
    );
    await Promise.all(
      Array.from({ length: 6 }, () =>
        sql.begin(async (tx) => {
          const [row] =
            await tx`SELECT count FROM persistence_check WHERE id = 'room' FOR UPDATE`;
          await tx`UPDATE persistence_check SET count = ${row.count + 1} WHERE id = 'room'`;
        }),
      ),
    );
    await sql.end();
    sql = localDatabase();
    const [saved] =
      await sql`SELECT data, count FROM persistence_check WHERE id = 'room'`;
    assert.deepEqual(saved.data, payload);
    assert.equal(saved.count, 6);
  } finally {
    await sql.end();
    delete process.env.RIVER_DATA_DIR;
    await rm(directory, { recursive: true, force: true });
  }
});
