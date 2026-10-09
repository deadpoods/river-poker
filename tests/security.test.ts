import { test } from "node:test";
import assert from "node:assert/strict";
import { body, checkOrigin, textInput } from "../src/lib/server/http";

test("same-origin validation uses the browser host and rejects cross-site requests", () => {
  assert.doesNotThrow(() =>
    checkOrigin(
      new Request("http://localhost:3000/api/rooms", {
        headers: { Host: "127.0.0.1:3000", Origin: "http://127.0.0.1:3000" },
      }),
    ),
  );
  assert.throws(
    () =>
      checkOrigin(
        new Request("https://river.example/api/rooms", {
          headers: { Host: "river.example", Origin: "https://evil.example" },
        }),
      ),
    /different site/,
  );
  assert.throws(
    () =>
      checkOrigin(
        new Request("https://river.example/api/rooms", {
          headers: { "sec-fetch-site": "cross-site" },
        }),
      ),
    /different site/,
  );
  assert.doesNotThrow(() =>
    checkOrigin(
      new Request("https://river.example/api/rooms", {
        headers: {
          Host: "river.example",
          Origin: "https://river.example",
          "x-forwarded-proto": "https",
        },
      }),
    ),
  );
});

test("request and name validation rejects malformed, oversized, and empty input", async () => {
  await assert.rejects(
    body(new Request("https://river.example", { method: "POST", body: "[]" })),
    /valid request/,
  );
  await assert.rejects(
    body(
      new Request("https://river.example", {
        method: "POST",
        body: "x".repeat(4097),
      }),
    ),
    /too large/,
  );
  assert.throws(() => textInput("\u0000\n", "Name", 24), /between/);
  assert.equal(textInput("  Ali\nce  ", "Name", 24), "Alice");
});
