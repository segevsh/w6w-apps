import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exactly one auth method (api-key, bearer)", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");
  assertEquals(app.auth?.[0].type, "bearer");
});

Deno.test("index: unique kebab-case keys, valid types, titles and params", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(keys.length, 14);
  for (const a of app.actions) {
    assert(/^[a-z][a-z0-9-]*$/.test(a.key), a.key);
    assert(["read", "search", "perform"].includes(a.type));
    assert(a.title.length > 0 && Array.isArray(a.params));
  }
});

Deno.test("index: generation actions are explicitly non-idempotent", () => {
  for (const key of ["chat-complete", "create-response", "create-message", "generate-image"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: service and quota health checks are declared", () => {
  const keys = app.healthChecks?.map((h) => h.key) ?? [];
  assertEquals(keys, ["service", "quota"]);
});

Deno.test("index: network.allow is exactly api.x.ai (status host rides on the feed)", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["api.x.ai"]);
});
