import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 42 actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, 42);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
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

Deno.test("index: every perform action states idempotency; creates and refreshes are not idempotent", () => {
  const byKey = new Map(app.actions.map((a) => [a.key, a]));
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  for (
    const k of [
      "datasource-create",
      "datasource-refresh-many",
      "datasource-instance-refresh",
      "klip-create",
      "dashboard-create",
      "user-create",
      "client-create",
      "group-create",
    ]
  ) assertEquals(byKey.get(k)?.idempotent, false, k);
  for (const k of ["klip-update", "user-delete", "group-user-add", "datasource-enable"]) {
    assertEquals(byKey.get(k)?.idempotent, true, k);
  }
});

Deno.test("index: reads are get/list and every param key is unique with a label", () => {
  for (const a of app.actions) {
    const keys = a.params!.map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${a.key}: duplicate param key`);
    for (const p of a.params!) assert(p.label, `${a.key}.${p.key}: no label`);
    if (a.type === "read") assert(/-(get|list)$/.test(a.key), `${a.key}: read but not get/list`);
  }
});

Deno.test("index: the auth method is the kf-api-key header and health checks declare absences", () => {
  assertEquals(app.auth[0].key, "api-key");
  assertEquals(app.auth[0].apiKey, { in: "header", name: "kf-api-key" });
  const byKey = new Map(app.healthChecks.map((h) => [h.key, h]));
  assertEquals(byKey.get("service")?.severity, "informational");
  assertEquals(byKey.get("quota")?.severity, "informational");
  assert(byKey.get("service")?.unavailable?.reason);
  assert(byKey.get("quota")?.unavailable?.reason);
  assertEquals(byKey.get("api")?.kind, "dependency");
});
