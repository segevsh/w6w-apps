import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

Deno.test("index: exports 5 actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, 5);
  assertEquals(app.auth?.length, 1);
  assertEquals(app.healthChecks?.length, 3);
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

Deno.test("index: no action exposes the deprecated highlights endpoint", () => {
  const keys = app.actions.map((a) => a.key);
  assert(!keys.includes("highlights-get"), "the vendor marks GET /highlights deprecated");
});

Deno.test("index: the auth method is an apiKey header credential with a secret field, sign and test", () => {
  const auth = app.auth![0];
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "x-api-key" });
  assertEquals(typeof auth.test, "function");
  assertEquals(typeof auth.sign, "function");
  const secretFields = (auth.fields ?? []).filter((f) => f.type === "secret");
  assertEquals(secretFields.length, 1);
  assertEquals(secretFields[0].key, "apiKey");
});

Deno.test("index: declared absences are informational, or they pin the verdict at unknown", () => {
  const absences = app.healthChecks!.filter((c) => c.unavailable);
  // `quota` — genuinely unavailable for this vendor. `service` and `api` are
  // both live probes.
  assertEquals(absences.map((c) => c.key).sort(), ["quota"]);
  for (const c of absences) {
    assertEquals(c.severity, "informational", `${c.key} absence is not informational`);
    assertEquals(c.check, undefined, `${c.key} declares both a hook and an absence`);
    assert(c.unavailable!.reason.length > 20, `${c.key} gives no reason`);
  }
});

Deno.test("index: both live health checks are unsigned and declare no unexpected egress", () => {
  for (const key of ["service", "api"]) {
    const check = app.healthChecks!.find((c) => c.key === key)!;
    assertEquals(typeof check.check, "function", `${key} has no check hook`);
    assertEquals(check.credential, "none", `${key} should be unsigned`);
    assertEquals(check.scope, "app", `${key} should be app-scoped`);
  }
  // `api` calls the app's own host, already in `network.allow` — no widening.
  assertEquals(app.healthChecks!.find((c) => c.key === "api")!.network, undefined);
  // `service` calls a third-party status host, which must be widened per-hook,
  // never added to the app's own egress allowlist.
  assertEquals(
    app.healthChecks!.find((c) => c.key === "service")!.network,
    { allow: ["tldv.instatus.com"] },
  );
});

Deno.test("index: health check keys are unique and none squats the derived `auth:` prefix", () => {
  const keys = app.healthChecks!.map((c) => c.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(!k.startsWith("auth:"), `${k} squats the derived prefix`);
});
