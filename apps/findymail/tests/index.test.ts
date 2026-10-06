import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 35 actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, 35);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "api-key");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: the deprecated find-from-domain endpoint is not exposed", () => {
  const keys = app.actions.map((a) => a.key);
  assert(!keys.some((k) => k.includes("domain-search") || k === "find-email-by-domain"));
  assertEquals(keys.includes("find-employees"), true);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action has a type, description, output, resource and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
    assert(a.resource, `${a.key}: no resource`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
  }
});

Deno.test("index: every perform action states idempotency; creates are not idempotent", () => {
  const byKey = new Map(app.actions.map((a) => [a.key, a]));
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  for (
    const k of ["create-list", "create-exclusion-list", "create-monitor", "intellimatch-search"]
  ) {
    assertEquals(byKey.get(k)?.idempotent, false, k);
  }
  for (const k of ["update-list", "delete-list", "delete-monitor", "add-excluded-domains"]) {
    assertEquals(byKey.get(k)?.idempotent, true, k);
  }
});

Deno.test("index: param keys are unique per action and every param has a label", () => {
  for (const a of app.actions) {
    const keys = a.params!.map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${a.key}: duplicate param key`);
    for (const p of a.params!) assert(p.label, `${a.key}.${p.key}: no label`);
  }
});

Deno.test("index: no action asks for a credential", () => {
  for (const a of app.actions) {
    for (const p of a.params!) {
      assert(!/api.?key|token|authorization/i.test(p.key), `${a.key}.${p.key}`);
    }
  }
});
