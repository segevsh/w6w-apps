import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 33);
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

Deno.test("index: every param has a key and a label, and every action a resource", () => {
  for (const a of app.actions) {
    assert(typeof a.resource === "string" && a.resource.length > 0, `${a.key}: no resource`);
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
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
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer scheme itself`);
    assert(!/api[_-]?token/i.test(src), `${a.key}: reaches for the token`);
  }
});

/**
 * The token is the whole credential AND the whole community selector on this
 * API — Circle mints it inside one community and it identifies that community.
 * So it must never be reachable as an action parameter, in any spelling: that
 * would put the credential in the network-capable worker and let two actions on
 * one Connection disagree about which community they are talking to.
 */
Deno.test("index: the token and the community are never action params", () => {
  const banned = /^(api_?token|api_?key|token|auth|community_?id|host|base_?url)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

Deno.test("index: no action hard-codes a host — the base URL lives in lib/client.ts", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL literal`);
  }
});

Deno.test("index: every action goes through CircleClient, so every call is ctx.fetch", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(src.includes("CircleClient"), `${a.key}: does not use the shared client`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// credential\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
  // And real violations must still be visible after stripping.
  assert(/credential/.test(code("const c = credential;")));
  assert(/Authorization/.test(code('h["Authorization"] = k;')));
});

// ------------------------------------------------------------------ health --

Deno.test("index: health checks cover the vendor and the quota question", () => {
  const byKey = Object.fromEntries(app.healthChecks.map((c) => [c.key, c]));
  assertEquals(byKey.service.kind, "service");
  assertEquals(byKey.quota.kind, "quota");
});

/**
 * Circle is fully vendor-hosted — there is no self-hosted Circle and no
 * per-tenant API host — so unlike the sibling `discourse` and `wordpress` apps
 * there is nothing per-Connection to probe. A `dependency` check here would
 * have to invent a host.
 */
Deno.test("index: there is deliberately no `dependency` check — one host serves every tenant", () => {
  assert(!app.healthChecks.some((c) => c.kind === "dependency"));
});

Deno.test("index: every `unavailable` check is informational, so it cannot pin the verdict", () => {
  for (const c of app.healthChecks.filter((c) => c.unavailable)) {
    assertEquals(c.severity, "informational", `${c.key}: unavailable but not informational`);
    assertEquals(c.check, undefined, `${c.key}: declares both a probe and an absence`);
    assert(c.unavailable?.reason && c.unavailable.reason.length > 0, `${c.key}: no reason given`);
    // An absence has nothing to reach, so it must not widen egress.
    assertEquals(c.network, undefined, `${c.key}: unavailable but widens egress`);
  }
});

Deno.test("index: the service check widens egress only for itself, and stays unsigned", () => {
  const service = app.healthChecks.find((c) => c.key === "service")!;
  assertEquals(service.network?.allow, ["status.circle.so"]);
  assert(service.credential === undefined || service.credential === "none");
});

/**
 * The judgement call this app makes, pinned so it cannot be "harmonised" with
 * the sibling `discourse` app.
 *
 * Discourse's service check is `informational` because `status.discourse.org`
 * reports Discourse's HOSTING business and most Discourse forums are
 * self-hosted and unaffected. That reasoning does not transfer: Circle is
 * fully vendor-hosted, every community's Admin API is served from the single
 * host `app.circle.so`, and a REST API outage therefore affects every
 * Connection without exception. Marking it informational would suppress a
 * signal that is true for everyone.
 *
 * What makes the default severity honest is the narrowing in `health/service.ts`
 * — the verdict tracks the Developer API component group, not Circle's global
 * indicator, so it only carries `degraded` weight for the component this App
 * actually calls.
 */
Deno.test("index: the service check keeps default severity because Circle is fully hosted", () => {
  const service = app.healthChecks.find((c) => c.key === "service")!;
  assertEquals(service.severity, undefined, "left at the `degraded` default, deliberately");
  assertEquals(service.scope, "app");
});
