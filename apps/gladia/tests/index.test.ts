import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares 6 actions with unique kebab-case keys", () => {
  assertEquals(app.actions.length, 6);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assertEquals(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), true, key);
});

Deno.test("index: one auth method, api-key, apiKey in header x-gladia-key", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");
  assertEquals(app.auth?.[0].apiKey, { in: "header", name: "x-gladia-key" });
});

Deno.test("index: declares service, api and quota health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["api", "quota", "service"]);
});

Deno.test("index: unavailable checks are informational", () => {
  for (const h of app.healthChecks ?? []) {
    if (h.unavailable) assertEquals(h.severity, "informational", h.key);
  }
});

Deno.test("index: every perform action declares idempotent; only model-list skips auth", () => {
  for (const a of app.actions) {
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  assertEquals(app.actions.filter((a) => a.requiresAuth === false).map((a) => a.key), [
    "model-list",
  ]);
});

Deno.test("index: every action has a description and output", () => {
  for (const a of app.actions) {
    assertEquals(!!a.description, true, a.key);
    assertEquals(!!a.output, true, a.key);
  }
});

Deno.test("index: no action targets the deprecated /v2/transcription paths", async () => {
  for (const f of Deno.readDirSync(new URL("../actions", import.meta.url))) {
    const src = await Deno.readTextFile(new URL(`../actions/${f.name}`, import.meta.url));
    assertEquals(src.includes('"/v2/transcription'), false, f.name);
    assertEquals(src.includes("`/v2/transcription"), false, f.name);
  }
});
