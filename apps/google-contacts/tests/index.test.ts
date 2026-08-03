import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import { READ_SOURCE_TYPES } from "../lib/client.ts";

Deno.test("index: exports 14 actions with unique kebab-case keys", () => {
  assertEquals(app.actions.length, 14);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `${key} is not kebab-case`);
  }
});

Deno.test("index: every action declares a type, title, description and output", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key} has a bad type`);
    assert(a.title, `${a.key} has no title`);
    assert(a.description, `${a.key} has no description`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key} declares no output`);
    assert(typeof a.execute === "function", `${a.key} has no execute hook`);
  }
});

Deno.test("index: every `perform` action declares `idempotent` honestly", () => {
  const performs = app.actions.filter((a) => a.type === "perform");
  assertEquals(performs.length, 7);
  for (const a of performs) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
  // Creating a contact or a group mints a new resource — a retry duplicates or
  // 409s, so these are the only two that must be false.
  const notIdempotent = performs.filter((a) => !a.idempotent).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["create-contact", "create-contact-group"]);
});

Deno.test("index: ships oauth2 only, with sign + test hooks", () => {
  assertEquals(app.auth?.length, 1);
  const [oauth2] = app.auth!;
  assertEquals(oauth2.key, "oauth2");
  assertEquals(oauth2.type, "oauth2");
  assertEquals(typeof oauth2.sign, "function");
  assertEquals(typeof oauth2.test, "function");
});

Deno.test("index: declares the service and quota health checks", () => {
  const keys = app.healthChecks?.map((h) => h.key) ?? [];
  assertEquals(keys, ["service", "quota"]);
});

Deno.test("index: no action names a `sources` option outside the documented enum", () => {
  const documented = new Set<string>(READ_SOURCE_TYPES);
  for (const a of app.actions) {
    const sources = a.params?.find((p) => p.key === "sources");
    if (!sources || !Array.isArray(sources.options)) continue;
    for (const o of sources.options) {
      assert(documented.has(String(o.value)), `${a.key}: ${o.value} is not a ReadSourceType`);
    }
  }
});
