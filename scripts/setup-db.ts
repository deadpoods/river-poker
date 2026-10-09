import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const { ensureSchema, database } = await import("../src/lib/server/db");
await ensureSchema();
console.log("River database is ready.");
await database().end();
