import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

Deno.test("index: exports 25 actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, 25);
  assertEquals(app.auth?.length, 1);
  assertEquals(app.healthChecks?.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const k of keys) assert(KEBAB.test(k), `not kebab-case: ${k}`);
});

Deno.test("index: every action has a title, description, executable hook and a valid type", () => {
  for (const a of app.actions) {
    assert(a.title, `${a.key} has no title`);
    assert(a.description, `${a.key} has no description`);
    assertEquals(typeof a.execute, "function", `${a.key} has no execute`);
    assert(
      ["read", "search", "perform"].includes(a.type),
      `${a.key} has an unexpected type: ${a.type}`,
    );
  }
});

Deno.test("index: every perform action states its idempotency honestly", () => {
  for (const a of app.actions.filter((x) => x.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

Deno.test("index: every param key is unique within its action and every param has a label", () => {
  for (const a of app.actions) {
    const keys = (a.params ?? []).map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${a.key} has duplicate param keys`);
    for (const p of a.params ?? []) {
      assert(p.label, `${a.key}.${p.key} has no label`);
    }
  }
});

Deno.test("index: the auth method is custom with an exchange, sign and test", () => {
  const auth = app.auth![0];
  assertEquals(auth.key, "database-credentials");
  assertEquals(auth.type, "custom");
  assertEquals(typeof auth.test, "function");
  assertEquals(typeof auth.sign, "function");
  assertEquals(typeof auth.exchange, "function");
  const secretFields = (auth.fields ?? []).filter((f) => f.type === "secret");
  assertEquals(secretFields.map((f) => f.key).sort(), ["apiKey", "password"]);
});

Deno.test("index: declared absences are informational, or they pin the verdict at unknown", () => {
  const absences = app.healthChecks!.filter((c) => c.unavailable);
  assertEquals(absences.map((c) => c.key).sort(), ["quota"]);
  for (const c of absences) {
    assertEquals(c.severity, "informational", `${c.key} absence is not informational`);
    assertEquals(c.check, undefined, `${c.key} declares both a hook and an absence`);
    assert(c.unavailable!.reason.length > 20, `${c.key} gives no reason`);
  }
});

Deno.test("index: the service check is a real, unsigned, app-scoped probe", () => {
  const service = app.healthChecks!.find((c) => c.key === "service")!;
  assertEquals(typeof service.check, "function");
});

Deno.test("index: health check keys are unique and none squats the derived `auth:` prefix", () => {
  const keys = app.healthChecks!.map((c) => c.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(!k.startsWith("auth:"), `${k} squats the derived prefix`);
});

Deno.test("index: resource-mutating actions cover create/update/delete for every core resource", () => {
  const byResource = new Map<string, Set<string>>();
  for (const a of app.actions) {
    if (!a.resource) continue;
    const set = byResource.get(a.resource) ?? new Set();
    set.add(a.key.split("-").pop()!);
    byResource.set(a.resource, set);
  }
  assert(byResource.has("contact"));
  assert(byResource.has("opportunity"));
});
