import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 21);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 3);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

Deno.test("index: idempotency matches what the underlying ORM method actually does", () => {
  const byKey = Object.fromEntries(app.actions.map((a) => [a.key, a]));
  // `write` twice with the same values leaves the same state.
  assertEquals(byKey["update-contact"].idempotent, true);
  assertEquals(byKey["update-lead"].idempotent, true);
  // Confirming an already-confirmed order is a no-op, not an error.
  assertEquals(byKey["confirm-order"].idempotent, true);
  // `create` has no natural key — two runs make two records.
  assertEquals(byKey["create-contact"].idempotent, false);
  assertEquals(byKey["create-lead"].idempotent, false);
  assertEquals(byKey["create-order"].idempotent, false);
  // Verified live: a second `unlink` of the same ids raises MissingError, so a
  // retry turns a succeeded call into a failed one.
  assertEquals(byKey["delete-contact"].idempotent, false);
  // The method is chosen at runtime, so no promise can be made.
  assertEquals(byKey["call-method"].idempotent, false);
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose.
 *
 * Without this the checks are simultaneously too weak and too strong: a doc
 * comment explaining *why* an action never touches the credential trips the
 * assertion, while a reviewer's natural fix — deleting the explanation — would
 * leave a real violation just as invisible.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    // Odoo-specific: the credential triple is unshifted by `sign`. An action
    // that named any of those slots would be building the signed form itself.
    assert(!/\bapiKey\b/.test(src), `${a.key}: references the API key`);
    // Actions must go through OdooClient, never assemble an envelope. Naming
    // `execute_kw` in prose or in a user-facing description is fine and useful;
    // IMPORTING the envelope builder or the signer is what would be wrong.
    assert(
      !/\bbuildExecuteKwBody\b|\bsignExecuteKw\b/.test(src),
      `${a.key}: assembles or signs the RPC envelope itself`,
    );
    assert(!/from\s+["']\.\.\/auth\//.test(src), `${a.key}: imports from auth/`);
  }
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// credential\nconst a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
  assert(/credential/.test(code("const c = credential;")));
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

Deno.test("index: every action that targets a fixed model declares it as its resource", () => {
  const generic = new Set(["search-records", "count-records", "call-method"]);
  for (const a of app.actions) {
    if (generic.has(a.key)) {
      // These take the model at runtime, so a fixed resource would be a lie.
      assertEquals(a.resource, undefined, `${a.key}: should not pin a resource`);
    } else {
      assert(
        typeof a.resource === "string" && a.resource.includes("."),
        `${a.key}: resource should be an Odoo model name`,
      );
    }
  }
});

Deno.test("index: the generic actions take a model param, since they pin no resource", () => {
  for (const key of ["search-records", "count-records", "call-method"]) {
    const action = app.actions.find((a) => a.key === key)!;
    const model = (action.params ?? []).find((p) => p.key === "model");
    assert(model, `${key}: no model param`);
    assertEquals(model.required, true, `${key}: model must be required`);
  }
});

// --- health surface ---------------------------------------------------------

Deno.test("index: health checks cover the three kinds", () => {
  const byKey = Object.fromEntries(app.healthChecks.map((c) => [c.key, c]));
  assertEquals(byKey.service.kind, "service");
  assertEquals(byKey.instance.kind, "dependency");
  assertEquals(byKey.quota.kind, "quota");
});

Deno.test("index: the two declared-absent checks are informational, or they pin the verdict", () => {
  // An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
  // in the roll-up — at any other severity these would pin every verdict at
  // `unknown` forever.
  for (const key of ["service", "quota"]) {
    const check = app.healthChecks.find((c) => c.key === key)!;
    assert(check.unavailable?.reason, `${key}: should declare an absence reason`);
    assertEquals(check.check, undefined, `${key}: unavailable and check are exclusive`);
    assertEquals(check.severity, "informational", `${key}: must not pin the roll-up`);
  }
});

Deno.test("index: the instance check is per-connection, unsigned, and widens no egress", () => {
  const instance = app.healthChecks.find((c) => c.key === "instance")!;
  assertEquals(instance.scope, "connection");
  // `context`: it needs the Connection to know WHICH host to call, and needs no
  // credential to interpret the answer, so `sign` must not run.
  assertEquals(instance.credential, "context");
  assertEquals(instance.network, undefined);
  assertEquals(typeof instance.check, "function");
});

Deno.test("index: no health check declares a status host, because none exists to declare", () => {
  // status.odoo.com serves the same HTML shell for every path, so probing it
  // would be worse than declaring the absence.
  for (const c of app.healthChecks) {
    assertEquals(c.network, undefined, `${c.key}: unexpected egress widening`);
    assertEquals((c as { feed?: unknown }).feed, undefined, `${c.key}: no feed exists`);
  }
});
