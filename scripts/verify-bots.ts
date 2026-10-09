import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";
import type { PublicRoom } from "../src/lib/types";

const base = process.env.RIVER_VERIFY_URL || "http://127.0.0.1:4317";
let cookie = "";
async function request(path: string, method = "GET", body?: unknown) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { Origin: base, Cookie: cookie, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const session = response.headers.getSetCookie().find((value) => value.startsWith("river_session="));
  if (session) cookie = session.split(";")[0];
  const result = await response.json();
  assert.ok(response.ok, `${method} ${path}: ${result.error || response.status}`);
  return result;
}
const { profile } = await request("/api/session", "POST", { name: "Bot verification" });
let { room } = await request("/api/rooms", "POST", {
  name: "Bot progression verification", practice: true,
  settings: { maxPlayers: 4, startingStack: 1000, smallBlind: 10, turnSeconds: 90 },
}) as { room: PublicRoom };
const code = room.code;
assert.equal(room.players.filter((player) => player.bot).length, 3);
const action = (type: string, extra = {}) => request(`/api/rooms/${code}/action`, "POST", { type, requestId: crypto.randomUUID(), ...extra });
if (!room.players.find((player) => player.id === profile.id)!.ready) await action("ready");
room = (await action("start")).room;
const deadline = Date.now() + 120_000;
while (!room.hand!.finishedAt) {
  assert.ok(Date.now() < deadline, "Bots did not finish within two minutes");
  if (room.hand!.actor === profile.id) {
    room = (await action("play", {
      kind: room.legal.canCheck ? "check" : "call", handNumber: room.hand!.number,
      street: room.hand!.street, currentBet: room.hand!.currentBet,
    })).room;
  } else {
    await setTimeout(1000);
    room = (await request(`/api/rooms/${code}`)).room;
  }
}
assert.equal(room.history.length, 1);
assert.equal(room.players.reduce((total, player) => total + player.stack, 0), 4000);
const archived = (await request(`/api/rooms/${code}/history`)).room;
assert.equal(archived.history.length, 1);
await action("end");
console.log("Verified: three cloud bots complete a practice hand, conserve all chips, and persist match history.");
