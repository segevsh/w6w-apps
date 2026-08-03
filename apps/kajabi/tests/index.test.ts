import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 49);
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
 * The two actions that must NOT be marked idempotent, pinned so a future
 * "consistency" pass cannot flip them.
 *
 * `form-submit` fires the creator's automations on every call — a retry can
 * mean a second welcome email to a real person. `contact-note-create` has no
 * natural key, so a retry leaves a duplicate note rather than converging.
 */
Deno.test("index: the two non-convergent writes stay non-idempotent", () => {
  const byKey = Object.fromEntries(app.actions.map((a) => [a.key, a]));
  assertEquals(byKey["form-submit"].idempotent, false);
  assertEquals(byKey["contact-note-create"].idempotent, false);
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

Deno.test("index: param keys are unique within an action", () => {
  for (const a of app.actions) {
    const keys = (a.params ?? []).map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${a.key}: duplicate param key`);
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
    assert(!/client_?secret/i.test(src), `${a.key}: reaches for the client secret`);
    assert(!/access_?token/i.test(src), `${a.key}: reaches for the token`);
  }
});

/**
 * The credential must never be reachable as an action parameter, in any
 * spelling — that would put it in the network-capable worker, which is exactly
 * what the `sign` hook exists to prevent.
 *
 * `siteId` is deliberately absent from this list: on Kajabi the site is a
 * documented query *filter*, not part of the credential, and one Connection can
 * legitimately address several sites. That is the opposite of the sibling
 * `circle` app, where the token IS the community selector — a difference worth
 * pinning so it is not "harmonised" later.
 */
Deno.test("index: credential material is never an action param", () => {
  const banned =
    /^(client_?id|client_?secret|api_?key|api_?token|token|auth|access_?token|refresh_?token|password|username|host|base_?url)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: credential material leaked into params`);
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

Deno.test("index: every action goes through KajabiClient, so every call is ctx.fetch", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(src.includes("KajabiClient"), `${a.key}: does not use the shared client`);
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

// -------------------------------------------------------------------- auth --

/**
 * Kajabi documents a resource-owner **password** grant and recommends against
 * it in the same sentence ("client credentials is preferred"). This app refuses
 * it: a Kajabi operator's account password is not an acceptable substitute for
 * a scoped, nameable, rotatable API key, and OAuth 2.1 removes the grant
 * outright.
 *
 * The grep keeps it from reappearing as a form field during a later "add more
 * auth options" pass — the same guard style the pack uses to keep a
 * credential-leaking probe out once it has been rejected.
 */
Deno.test("auth: the username/password grant is not offered", async () => {
  const auth = app.auth[0];
  for (const f of auth.fields ?? []) {
    assert(
      !/^(username|password)$/i.test(f.key),
      `auth exposes a ${f.key} field — the password grant was rejected deliberately`,
    );
  }
  const src = code(
    await Deno.readTextFile(new URL("../auth/client-credentials.ts", import.meta.url)),
  );
  assert(
    !/grant_type:\s*"password"/.test(src),
    "auth builds a password grant",
  );
});

Deno.test("auth: declares the hooks a client-credentials connection needs", () => {
  const auth = app.auth[0];
  assertEquals(auth.key, "client-credentials");
  assertEquals(auth.type, "custom");
  for (const hook of ["exchange", "refresh", "sign", "test", "afterConnect", "revoke"] as const) {
    assertEquals(typeof auth[hook], "function", `auth: missing ${hook}`);
  }
});

Deno.test("auth: both credential fields are secret", () => {
  const auth = app.auth[0];
  const byKey = Object.fromEntries((auth.fields ?? []).map((f) => [f.key, f]));
  for (const key of ["clientId", "clientSecret"]) {
    assertEquals(byKey[key].type, "secret", `${key} is not a secret field`);
    assertEquals(byKey[key].required, true, `${key} is not required`);
  }
});

// ------------------------------------------------------------------ health --

Deno.test("index: health checks cover the vendor and the quota question", () => {
  const byKey = Object.fromEntries(app.healthChecks.map((c) => [c.key, c]));
  assertEquals(byKey.service.kind, "service");
  assertEquals(byKey.quota.kind, "quota");
});

/**
 * Kajabi serves every tenant from the single host `api.kajabi.com` — the site
 * travels as a `filter[site_id]` query parameter, not as a per-tenant hostname.
 * So unlike `wordpress` or `grist` there is nothing per-Connection to probe,
 * and a `dependency` check would have to invent a host.
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
  assertEquals(service.network?.allow, ["status.kajabi.com"]);
  assert(service.credential === undefined || service.credential === "none");
});

/**
 * The judgement call this app makes, pinned so it cannot be "harmonised" with
 * the sibling `circle` app.
 *
 * Circle's service check keeps the default `degraded` severity because
 * `status.circle.so` publishes a *Developer API* component group covering the
 * exact REST API that app calls. Kajabi's status page publishes **no component
 * for its public REST API at all** — and the group it does call `API` contains
 * only *Inbound Webhooks*, a different surface this app never touches.
 *
 * So the strongest available signal, `App Availability`, is a genuine
 * precondition but not a certification: Kajabi being down means the API is
 * down, while Kajabi being up proves nothing about `api.kajabi.com`. A
 * one-directional signal must not be able to pull a tenant into `degraded`,
 * hence `informational`.
 */
Deno.test("index: the service check is informational because no REST API component exists", () => {
  const service = app.healthChecks.find((c) => c.key === "service")!;
  assertEquals(service.severity, "informational");
  assertEquals(service.scope, "app");
});
