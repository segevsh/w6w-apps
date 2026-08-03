import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 16 actions with unique kebab-case keys", () => {
  assertEquals(app.actions.length, 16);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const k of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(k), `\`${k}\` is not kebab-case`);
  }
});

Deno.test("index: every action declares title, description, output and an execute hook", () => {
  for (const a of app.actions) {
    assert(a.title, `${a.key} missing title`);
    assert(a.description, `${a.key} missing description`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key} missing output`);
    assertEquals(typeof a.execute, "function", `${a.key} missing execute`);
  }
});

Deno.test("index: every `perform` action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((x) => x.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} must declare idempotent`);
  }
});

Deno.test("index: action types are drawn from the read/perform set", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key} has type ${a.type}`);
  }
});

Deno.test("index: exports the single api-key auth method", () => {
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "api-key");
  assertEquals(typeof app.auth[0].test, "function");
  assertEquals(typeof app.auth[0].sign, "function");
});

Deno.test("index: exports the service and quota health checks", () => {
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: every action carries a `resource` grouping hint", () => {
  const resources: string[] = [];
  for (const a of app.actions) {
    assert(a.resource, `${a.key} missing resource`);
    if (!resources.includes(a.resource)) resources.push(a.resource);
  }
  assertEquals(resources.sort(), ["campaign", "field", "group", "segment", "subscriber"]);
});
