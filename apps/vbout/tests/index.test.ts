import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

test("index: exposes 26 actions with unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 26);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z]+(-[a-z]+)*$/.test(k), k);
});

test("index: one api-key auth method and the three health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

test("index: every perform action declares idempotency, every read does not", () => {
  for (const a of app.actions) {
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
    else assertEquals(a.idempotent, undefined, a.key);
  }
});

test("index: no action sets credentials or a key parameter", () => {
  for (const a of app.actions) {
    assert(!(a.params ?? []).some((p) => p.key === "key" || p.key === "apiKey"), a.key);
  }
});
