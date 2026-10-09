import { resolve } from "node:path";
import type postgres from "postgres";
import type { Results } from "@electric-sql/pglite";

// Development runs the same PostgreSQL schema and transactions on disk. The
// cloud path always uses an external database; embedded storage is never used
// on Vercel's ephemeral filesystem.
export function localDatabase(): ReturnType<typeof postgres> {
  const ready = import("@electric-sql/pglite").then(
    ({ PGlite }) =>
      new PGlite(
        process.env.RIVER_DATA_DIR || resolve(process.cwd(), ".river-data"),
      ),
  );
  type Query = (text: string, values: unknown[]) => Promise<Results>;
  function wrap(query: Query) {
    const tag = async (parts: TemplateStringsArray, ...values: unknown[]) => {
      const text = parts.reduce(
        (sql, part, i) => sql + (i ? `$${i}` : "") + part,
        "",
      );
      return (await query(text, values)).rows;
    };
    tag.json = (value: unknown) => JSON.stringify(value);
    return tag;
  }
  const tag = wrap(async (text, values) => (await ready).query(text, values));
  const sql = Object.assign(tag, {
    begin: async <T>(
      callback: (tx: ReturnType<typeof postgres>) => Promise<T>,
    ) =>
      (await ready).transaction((tx) =>
        callback(
          wrap((text, values) =>
            tx.query(text, values),
          ) as unknown as ReturnType<typeof postgres>,
        ),
      ),
    end: async () => (await ready).close(),
  });
  // Only tagged queries, json(), begin(), and end() are shared with postgres.js.
  return sql as unknown as ReturnType<typeof postgres>;
}
