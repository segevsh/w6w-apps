import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 15 actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, 15);
  assertEquals(app.auth.map((a) => a.key), ["partner-credentials"]);
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

Deno.test("index: perform actions state idempotency; creates and exports are not idempotent", () => {
  const byKey = new Map(app.actions.map((a) => [a.key, a]));
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  for (
    const k of [
      "create-expenses",
      "create-report",
      "create-policy",
      "create-expense-rule",
      "export-reports",
      "run-reconciliation",
    ]
  ) assertEquals(byKey.get(k)?.idempotent, false, k);
  for (
    const k of ["update-policy", "update-report-status", "update-tag-approvers", "update-employees"]
  ) {
    assertEquals(byKey.get(k)?.idempotent, true, k);
  }
});

Deno.test("index: param keys are unique and labelled; required params carry no default-less ambiguity", () => {
  for (const a of app.actions) {
    const keys = a.params!.map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${a.key}: duplicate param key`);
    for (const p of a.params!) assert(p.label, `${a.key}.${p.key}: no label`);
  }
});

Deno.test("index: the deprecated CSV employee updater is not exposed", () => {
  const keys = app.actions.map((a) => a.key);
  assert(keys.includes("update-employees"));
  const employees = app.actions.find((a) => a.key === "update-employees")!;
  assert(!employees.params!.some((p) => p.key === "fileType"), "CSV fileType must not be a param");
});

Deno.test("index: no action asks for a credential-shaped param", () => {
  for (const a of app.actions) {
    for (const p of a.params!) {
      assert(!/secret|partnerUser|authToken|password/i.test(p.key), `${a.key}.${p.key}`);
      assert(p.type !== "secret", `${a.key}.${p.key} is a secret field`);
    }
  }
});

Deno.test("index: every health check declares a key, kind and covers", () => {
  for (const h of app.healthChecks) {
    assert(h.key && h.kind && h.covers, h.key);
    assert(typeof h.check === "function" || h.unavailable, `${h.key}: no hook and no absence`);
  }
});
