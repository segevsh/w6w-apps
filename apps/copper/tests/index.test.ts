import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 24);
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

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
  }
});

/**
 * The Copper-specific half of the same rule.
 *
 * Copper's credential is a SET of three headers, none of them `Authorization`,
 * so the generic check above would miss an action that hand-built
 * `X-PW-AccessToken` or `X-PW-UserEmail`. All three names are banned from
 * executable action code outright: they belong to `auth/api-key.ts` and nowhere
 * else.
 */
Deno.test("index: no action builds an X-PW-* header — all three belong to sign", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/x-pw-accesstoken/i.test(src), `${a.key}: builds X-PW-AccessToken itself`);
    assert(!/x-pw-useremail/i.test(src), `${a.key}: builds X-PW-UserEmail itself`);
    assert(!/x-pw-application/i.test(src), `${a.key}: builds X-PW-Application itself`);
  }
});

/**
 * The user email is half the credential. It must never be reachable as an
 * action parameter, in any spelling — that would put credential material in the
 * network-capable worker and let two actions on one Connection disagree about
 * who they are.
 *
 * `find-person-by-email` legitimately takes an `email` param: that is the
 * address of the CONTACT being looked up, not of the token owner. The
 * distinction the test enforces is therefore on `userEmail` / `user_email` /
 * `tokenOwner*`, not on the word "email".
 */
Deno.test("index: the token owner's email is never an action param", () => {
  const banned = /^(user_?email|token_?owner|owner_?email|pw_?user_?email)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: the credential's email leaked into params`);
    }
  }
});

Deno.test("index: the token owner's email is an auth FIELD, which is where it belongs", () => {
  const fields = app.auth[0].fields ?? [];
  assertEquals(fields.map((f) => f.key), ["apiKey", "userEmail"]);
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  // Guards the guard: if `code()` silently stopped stripping, the sandbox checks
  // would still pass and would still be worthless.
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// credential\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
  // And real violations must still be visible after stripping.
  assert(/credential/.test(code("const c = credential;")));
  assert(/X-PW-AccessToken/.test(code('h["X-PW-AccessToken"] = k;')));
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
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
  assertEquals(service.network?.allow, ["status.copper.com"]);
  // Widening egress is bound to an unsigned posture — `none` is this kind's default.
  assert(service.credential === undefined || service.credential === "none");
});

Deno.test("index: the quota check declares no probe, because Copper exposes no headroom", () => {
  const quota = app.healthChecks.find((c) => c.key === "quota")!;
  assertEquals(quota.check, undefined);
  assert(quota.unavailable?.reason && quota.unavailable.reason.length > 0);
  // An `unavailable` entry must not also widen egress — there is nothing to reach.
  assertEquals(quota.network, undefined);
});
