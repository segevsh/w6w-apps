import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 17);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
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

Deno.test("index: the actions that can double-charge or double-create are NOT idempotent", () => {
  const byKey = Object.fromEntries(app.actions.map((a) => [a.key, a]));
  assertEquals(byKey["create-account"].idempotent, false);
  assertEquals(byKey["create-subscription"].idempotent, false);
  assertEquals(byKey["collect-invoice"].idempotent, false);
});

Deno.test("index: update and cancel actions ARE idempotent — retries converge", () => {
  const byKey = Object.fromEntries(app.actions.map((a) => [a.key, a]));
  assertEquals(byKey["update-account"].idempotent, true);
  assertEquals(byKey["cancel-subscription"].idempotent, true);
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose — a doc
 * comment naming "credential" or "authorization" for explanatory reasons must
 * not trip a check meant to catch the real thing.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

const WRITES_AUTH_HEADER = /["'`]?authorization["'`]?\s*[\]:=]/i;

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!WRITES_AUTH_HEADER.test(src), `${a.key}: sets the auth header itself`);
  }
});

Deno.test("index: that auth-header guard still catches a real violation", () => {
  assert(WRITES_AUTH_HEADER.test('headers["authorization"] = "Basic x";'));
  assert(WRITES_AUTH_HEADER.test("headers: { authorization: token }"));
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

Deno.test("index: no action hard-codes a Recurly host — the host is per-connection", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/recurly\.com/i.test(src), `${a.key}: hard-codes a Recurly host`);
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

Deno.test("index: every select param offers a non-empty static option list", () => {
  for (const a of app.actions) {
    for (const p of (a.params ?? []).filter((p) => p.type === "select")) {
      assert(Array.isArray(p.options), `${a.key}/${p.key}: select without static options`);
      assert((p.options as unknown[]).length > 0, `${a.key}/${p.key}: empty option list`);
    }
  }
});

Deno.test("index: every action that names a resource path takes an id param", () => {
  const byKey = Object.fromEntries(app.actions.map((a) => [a.key, a]));
  const required = (key: string, paramKey: string) => {
    const p = (byKey[key].params ?? []).find((p) => p.key === paramKey);
    assert(p, `${key}: missing ${paramKey}`);
    assertEquals(p!.required, true, `${key}/${paramKey} should be required`);
  };
  required("get-account", "accountId");
  required("update-account", "accountId");
  required("get-subscription", "subscriptionId");
  required("cancel-subscription", "subscriptionId");
  required("get-plan", "planId");
  required("get-invoice", "invoiceId");
  required("collect-invoice", "invoiceId");
  required("get-transaction", "transactionId");
  required("get-coupon", "couponId");
});

Deno.test("index: every list action exposes the shared paging params and Recurly's list envelope", () => {
  const lists = app.actions.filter((a) => a.type === "search");
  assertEquals(lists.length, 6);
  for (const a of lists) {
    const keys = (a.params ?? []).map((p) => p.key);
    for (const shared of ["limit", "order", "ids", "next"]) {
      assert(keys.includes(shared), `${a.key}: missing shared page param ${shared}`);
    }
    const output = (a.output as Array<{ key: string }>).map((o) => o.key);
    assertEquals(output, ["object", "has_more", "next", "data"], `${a.key}: wrong list envelope`);
  }
});

Deno.test("index: health checks cover the declared kinds", () => {
  const byKey = Object.fromEntries(app.healthChecks.map((c) => [c.key, c]));
  assertEquals(byKey.service.kind, "service");
  assertEquals(byKey.quota.kind, "quota");
});

Deno.test("index: the service check widens egress only for itself, and stays unsigned", () => {
  const service = app.healthChecks.find((c) => c.key === "service")!;
  assertEquals(service.network?.allow, ["status.recurly.com"]);
  assert(service.credential === undefined || service.credential === "none");
});

Deno.test("index: the quota check has no `unavailable` — Recurly publishes real headers", () => {
  const quota = app.healthChecks.find((c) => c.key === "quota")!;
  assertEquals(quota.unavailable, undefined);
});
