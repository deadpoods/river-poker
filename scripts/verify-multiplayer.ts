import assert from "node:assert/strict";
import nextEnv from "@next/env";
import type { Profile, PublicRoom, Settings } from "../src/lib/types";

nextEnv.loadEnvConfig(process.cwd(), true);
const base = process.env.RIVER_VERIFY_URL || "http://127.0.0.1:3000";
const protectionHeaders: Record<string, string> = {};
if (process.env.RIVER_VERIFY_USE_VERCEL_OIDC === "1") {
  const target = new URL(base);
  assert.ok(
    target.protocol === "https:" && target.hostname.endsWith(".vercel.app"),
    "OIDC verification requires a Vercel preview URL",
  );
  assert.ok(
    process.env.VERCEL_OIDC_TOKEN,
    "Pull the linked project's development environment first",
  );
  protectionHeaders["x-vercel-trusted-oidc-idp-token"] =
    process.env.VERCEL_OIDC_TOKEN;
}
class Client {
  cookie = "";
  async request(path: string, method = "GET", data?: unknown, expected = 200) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...protectionHeaders,
        "Content-Type": "application/json",
        Origin: base,
        Cookie: this.cookie,
      },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: AbortSignal.timeout(30_000),
    });
    const cookie = response.headers
      .getSetCookie()
      .find((c) => c.startsWith("river_session="));
    if (cookie) this.cookie = cookie.split(";")[0];
    const result = await response.json();
    assert.equal(
      response.status,
      expected,
      `${method} ${path}: ${result.error || response.status}`,
    );
    return result;
  }
  action(
    code: string,
    type: string,
    extra: Record<string, unknown> = {},
    expected = 200,
  ) {
    return this.request(
      `/api/rooms/${code}/action`,
      "POST",
      { type, requestId: crypto.randomUUID(), ...extra },
      expected,
    );
  }
}
const host = new Client(),
  guest = new Client(),
  outsider = new Client(),
  restored = new Client();
const [{ profile: a }, { profile: b }] = (await Promise.all([
  host.request("/api/session", "POST", { name: "Check Host" }),
  guest.request("/api/session", "POST", { name: "Check Guest" }),
])) as { profile: Profile }[];
await outsider.request("/api/session", "POST", { name: "Check Observer" });
const settings: Settings = {
  maxPlayers: 2,
  startingStack: 1000,
  smallBlind: 10,
  turnSeconds: 90,
};
const { room: lobby } = (await host.request(
  "/api/rooms",
  "POST",
  { name: "Multiplayer verification", settings },
  201,
)) as { room: PublicRoom };
const code = lobby.code;
await outsider.request(`/api/rooms/${code}`, "GET", undefined, 403);
await host.action(code, "start", {}, 400);
await guest.request("/api/rooms/join", "POST", { code });
await outsider.request("/api/rooms/join", "POST", { code }, 409);
await host.request("/api/profile", "PATCH", {
  name: "Check Host Updated",
  color: "rose",
});
const identityView = (await guest.request(`/api/rooms/${code}`))
  .room as PublicRoom;
assert.equal(
  identityView.players.find((p) => p.id === a.id)!.name,
  "Check Host Updated",
);
assert.equal(identityView.players.find((p) => p.id === a.id)!.color, "rose");
await Promise.all([
  host.request("/api/profile", "PATCH", { preferences: { sound: true } }),
  host.request("/api/profile", "PATCH", {
    preferences: { reducedMotion: true },
  }),
]);
const updatedProfile = (await host.request("/api/session")).profile as Profile;
assert.equal(updatedProfile.name, "Check Host Updated");
assert.equal(updatedProfile.preferences.sound, true);
assert.equal(updatedProfile.preferences.reducedMotion, true);
await host.action(code, "ready");
await guest.action(code, "ready");
await guest.action(code, "start", {}, 403);
let { room } = (await host.action(code, "start")) as { room: PublicRoom };
assert.equal(room.hand!.actor, a.id);
assert.ok(room.players.find((p) => p.id === a.id)!.cards.every(Boolean));
assert.ok(
  room.players.find((p) => p.id === b.id)!.cards.every((c) => c === null),
);
assert.equal("deck" in room.hand!, false);
assert.equal("seed" in room.hand!, false);

async function streamSnapshot(client: Client) {
  const controller = new AbortController();
  const response = await fetch(`${base}/api/rooms/${code}/stream`, {
    headers: { ...protectionHeaders, Cookie: client.cookie },
    signal: controller.signal,
  });
  assert.equal(response.status, 200);
  const reader = response.body!.getReader(),
    decoder = new TextDecoder();
  let text = "";
  try {
    while (!text.includes("\n\n")) {
      const chunk = await reader.read();
      if (chunk.done) throw new Error("Stream closed before a state");
      text += decoder.decode(chunk.value, { stream: true });
    }
    const line = text.split("\n").find((line) => line.startsWith("data: "));
    return JSON.parse(line!.slice(6)) as PublicRoom;
  } finally {
    controller.abort();
    await reader.cancel().catch(() => {});
  }
}
let guestView = await streamSnapshot(guest);
assert.ok(guestView.players.find((p) => p.id === b.id)!.cards.every(Boolean));
assert.ok(
  guestView.players.find((p) => p.id === a.id)!.cards.every((c) => c === null),
);
const command = {
  type: "play",
  kind: "call",
  handNumber: room.hand!.number,
  street: room.hand!.street,
  currentBet: room.hand!.currentBet,
  requestId: crypto.randomUUID(),
};
await Promise.all([
  host.request(`/api/rooms/${code}/action`, "POST", command),
  host.request(`/api/rooms/${code}/action`, "POST", command),
]);
room = (await host.request(`/api/rooms/${code}`)).room;
assert.equal(room.hand!.actor, b.id);
assert.equal(room.players.find((p) => p.id === a.id)!.committed, 20);
assert.equal(room.hand!.pot, 40);
await host.action(
  code,
  "play",
  { kind: "call", handNumber: 1, street: "preflop", currentBet: 20 },
  409,
);
guestView = (await guest.request(`/api/rooms/${code}`)).room;
await guest.action(code, "play", {
  kind: "check",
  handNumber: 1,
  street: "preflop",
  currentBet: 20,
});
room = (await host.request(`/api/rooms/${code}`)).room;
assert.equal(room.hand!.street, "flop");
const { assistant } = await host.request(`/api/rooms/${code}/assistant`);
assert.equal(assistant.trials, 800);
assert.equal(assistant.opponents, 1);
await host.action(
  code,
  "play",
  { kind: "check", handNumber: 1, street: "preflop", currentBet: 20 },
  409,
);
let decisions = 0;
while (!room.hand!.finishedAt) {
  assert.ok(++decisions < 15);
  const client = room.hand!.actor === a.id ? host : guest;
  const snapshot = (await client.request(`/api/rooms/${code}`))
    .room as PublicRoom;
  await client.action(code, "play", {
    kind: snapshot.legal.canCheck ? "check" : "call",
    handNumber: snapshot.hand!.number,
    street: snapshot.hand!.street,
    currentBet: snapshot.hand!.currentBet,
  });
  room = (await host.request(`/api/rooms/${code}`)).room;
}
assert.equal(
  room.players.reduce((sum, p) => sum + p.stack, 0),
  2000,
);
assert.equal(room.history.length, 1);
assert.equal(room.hand!.board.length, 5);
await host.action(code, "end");
const { stats } = await host.request("/api/profile/stats?mode=friends");
assert.equal(stats.hands, 1);
assert.equal(stats.sessions, 1);
assert.equal(stats.actions.call, 1);
assert.equal(stats.playstyle.sample, 1);
assert.equal(stats.playstyle.vpip.value, 100);
assert.equal(stats.playstyle.pfr.value, 0);
assert.equal(stats.playstyle.bluff.value, null);
assert.equal((await host.request("/api/profile/stats?mode=practice")).stats.playstyle.sample, 0);
const { sessions } = await host.request("/api/history");
assert.ok(
  sessions.some(
    (s: { code: string; hands: number }) => s.code === code && s.hands === 1,
  ),
);
const { key: recoveryKey } = await host.request(
  "/api/profile/recovery",
  "POST",
  {},
);
const { profile: recovered } = await restored.request("/api/session", "POST", {
  recoveryKey,
});
assert.equal(recovered.id, a.id);
assert.equal(
  (await restored.request(`/api/rooms/${code}`)).room.history.length,
  1,
);
assert.equal((await host.request("/api/session")).profile.id, a.id);
await guest.action(code, "leave");
await guest.request(`/api/rooms/${code}`, "GET", undefined, 403);
assert.equal(
  (await guest.request(`/api/rooms/${code}/history`)).room.history.length,
  1,
);
await outsider.request(`/api/rooms/${code}/history`, "GET", undefined, 404);
console.log(
  "Verified: two private sessions, profile identity synchronization, concurrent preference saves, lobby permissions, live streams, hidden cards, concurrent idempotent actions, stale-action rejection, full hand, chip conservation, history, statistics, refresh, and profile recovery.",
);
