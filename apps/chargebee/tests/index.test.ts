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

Deno.test("index: the two actions that can double-charge or double-create are NOT idempotent", () => {
  const byKey = Object.fromEntries(app.actions.map((a) => [a.key, a]));
  // A retry here creates a second subscription / attempts a second charge, and
  // this App sends no `chargebee-idempotency-key` header.
  assertEquals(byKey["create-subscription"].idempotent, false);
  assertEquals(byKey["collect-payment"].idempotent, false);
  assertEquals(byKey["create-customer"].idempotent, false);
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose.
 *
 * Without this the checks are simultaneously too weak and too strong: a doc
 * comment explaining *why* an action never touches the credential trips the
 * assertion, while a reviewer's natural fix — deleting the explanation — would
 * leave a real violation just as invisible. Scanning only executable text makes
 * the guard mean what it says.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

/**
 * The pack auditor's own "is an auth header being written" pattern.
 *
 * A bare `/authorization/i` would be wrong here rather than merely strict:
 * `collect-payment` legitimately sends Chargebee's `authorization_transaction_id`
 * parameter, which captures a previously authorised card transaction and has
 * nothing to do with HTTP auth. Anchoring on the assignment/subscript that
 * follows the word is what separates writing a header from naming a field.
 */
const WRITES_AUTH_HEADER = /["'`]?authorization["'`]?\s*[\]:=]/i;

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!WRITES_AUTH_HEADER.test(src), `${a.key}: sets the auth header itself`);
  }
});

Deno.test("index: that auth-header guard still catches a real violation", () => {
  // Guards the guard, since it was loosened to let a legitimate parameter name
  // through.
  assert(WRITES_AUTH_HEADER.test('headers["authorization"] = "Basic x";'));
  assert(WRITES_AUTH_HEADER.test("headers: { authorization: token }"));
  assert(!WRITES_AUTH_HEADER.test("authorization_transaction_id: input.x,"));
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

Deno.test("index: no action hard-codes a Chargebee host — the host is per-connection", async () => {
  // The whole point of `ChargebeeClient.fromConnection` is that the site comes
  // from the Connection. A literal host in an action would work for exactly one
  // customer and silently misroute for every other.
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/chargebee\.com/i.test(src), `${a.key}: hard-codes a Chargebee host`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// credential\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
  // And a real violation must still be visible after stripping.
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
  required("get-customer", "customerId");
  required("update-customer", "customerId");
  required("get-subscription", "subscriptionId");
  required("create-subscription", "customerId");
  required("create-subscription", "subscriptionItems");
  required("cancel-subscription", "subscriptionId");
  required("pause-subscription", "subscriptionId");
  required("resume-subscription", "subscriptionId");
  required("get-invoice", "invoiceId");
  required("collect-payment", "invoiceId");
});

Deno.test("index: every list action exposes the shared paging params and envelope", () => {
  const lists = app.actions.filter((a) => a.type === "search");
  assertEquals(lists.length, 7);
  for (const a of lists) {
    const keys = (a.params ?? []).map((p) => p.key);
    assert(keys.includes("limit"), `${a.key}: no limit param`);
    assert(keys.includes("offset"), `${a.key}: no offset param`);
    const output = (a.output as Array<{ key: string }>).map((o) => o.key);
    assertEquals(output, ["list", "next_offset"], `${a.key}: wrong list envelope`);
  }
});

Deno.test("index: `offset` is a string everywhere — it is an opaque cursor, not a row count", () => {
  for (const a of app.actions.filter((a) => a.type === "search")) {
    const offset = (a.params ?? []).find((p) => p.key === "offset")!;
    assertEquals(offset.type, "string", `${a.key}: offset must not be numeric`);
  }
});

Deno.test("index: health checks cover the declared kinds and are informational where they should be", () => {
  const byKey = Object.fromEntries(app.healthChecks.map((c) => [c.key, c]));
  assertEquals(byKey.service.kind, "service");
  assertEquals(byKey.quota.kind, "quota");
  // A quota reading must never fail a roll-up on its own.
  assertEquals(byKey.quota.severity, "informational");
});

Deno.test("index: the service check widens egress only for itself, and stays unsigned", () => {
  const service = app.healthChecks.find((c) => c.key === "service")!;
  assertEquals(service.network?.allow, ["status.chargebee.com"]);
  // Widening egress is bound to an unsigned posture — `none` is this kind's default.
  assert(service.credential === undefined || service.credential === "none");
});

Deno.test("index: the quota check declares no egress, having nothing to probe", () => {
  const quota = app.healthChecks.find((c) => c.key === "quota")!;
  assertEquals(quota.network, undefined);
  assert(quota.unavailable);
});
