import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 26);
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

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
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
 * The Discourse-specific half of the same rule.
 *
 * Discourse's credential is a PAIR of headers, neither of them `Authorization`,
 * so the generic check above would miss an action that hand-built `Api-Key` or
 * `Api-Username`. Both names are banned from executable action code outright:
 * they belong to `auth/api-key.ts` and nowhere else.
 *
 * `User-Api-Key` is banned too. It is Discourse's *other* credential header —
 * the one this app deliberately does not implement — and an action reaching for
 * it would be improvising an auth scheme inside the network-capable worker.
 */
Deno.test("index: no action builds an Api-Key/Api-Username header — both belong to sign", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/["'`]?api-key["'`]?\s*[\]:=]/i.test(src), `${a.key}: builds Api-Key itself`);
    assert(!/["'`]?api-username["'`]?\s*[\]:=]/i.test(src), `${a.key}: builds Api-Username itself`);
    assert(!/user-api-key/i.test(src), `${a.key}: reaches for the User-Api-Key scheme`);
  }
});

/**
 * The acting username is half of "which principal is this". It must never be
 * reachable as an action parameter, in any spelling — that would put
 * credential-adjacent material in the network-capable worker and let two
 * actions on one Connection disagree about who they are.
 *
 * `user-get` / `user-update` legitimately take a `username` param: that is the
 * user being READ or WRITTEN, not the user the request is made AS. The
 * distinction the test enforces is therefore on `apiUsername` / `api_username`,
 * not on the word "username".
 */
Deno.test("index: the acting API username is never an action param", () => {
  const banned = /^(api_?username|api_?user|acting_?user|api_?key|site_?url)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

Deno.test("index: the credential's three parts are auth FIELDS, which is where they belong", () => {
  const fields = app.auth[0].fields ?? [];
  assertEquals(fields.map((f) => f.key), ["siteUrl", "apiKey", "apiUsername"]);
  // The key is masked; the forum URL and the username are identifiers, not
  // secrets, and masking them would make a typo impossible to spot.
  assertEquals(fields.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(fields.find((f) => f.key === "apiUsername")?.type, "string");
  assertEquals(fields.find((f) => f.key === "siteUrl")?.type, "string");
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

Deno.test("index: no action hard-codes a forum host — the URL comes from the Connection", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/https:\/\//.test(src), `${a.key}: contains an absolute URL literal`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// credential\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
  // And real violations must still be visible after stripping.
  assert(/credential/.test(code("const c = credential;")));
  assert(/Api-Key/.test(code('h["Api-Key"] = k;')));
});

// ------------------------------------------------------------------ health --

Deno.test("index: health checks cover service, quota and the per-connection dependency", () => {
  const byKey = Object.fromEntries(app.healthChecks.map((c) => [c.key, c]));
  assertEquals(byKey.service.kind, "service");
  assertEquals(byKey.quota.kind, "quota");
  assertEquals(byKey.site.kind, "dependency");
});

Deno.test("index: every `unavailable` check is informational, so it cannot pin the verdict", () => {
  for (const c of app.healthChecks.filter((c) => c.unavailable)) {
    // An `unavailable` entry reports `unknown`, and `unknown` outranks `ok` in
    // the roll-up. At any other severity a declared absence would pin the App
    // at `unknown` forever.
    assertEquals(c.severity, "informational", `${c.key}: unavailable but not informational`);
    assertEquals(c.check, undefined, `${c.key}: declares both a probe and an absence`);
    assert(c.unavailable?.reason && c.unavailable.reason.length > 0, `${c.key}: no reason given`);
    // An absence has nothing to reach, so it must not widen egress.
    assertEquals(c.network, undefined, `${c.key}: unavailable but widens egress`);
  }
});

Deno.test("index: the service check widens egress only for itself, and stays unsigned", () => {
  const service = app.healthChecks.find((c) => c.key === "service")!;
  assertEquals(service.network?.allow, ["api.status.io"]);
  // Widening egress is bound to an unsigned posture — `none` is this kind's default.
  assert(service.credential === undefined || service.credential === "none");
});

/**
 * The judgement call this app makes, pinned so it cannot be "tidied" back to
 * the default. `status.discourse.org` reports Discourse's HOSTING business;
 * most Discourse installs are self-hosted and unaffected by any of it. At the
 * `degraded` default, a Discourse Cloud incident would pin every self-hosted
 * tenant's App at `degraded`, which would be false. The per-connection `site`
 * check is the signal that speaks for an individual forum.
 */
Deno.test("index: the service check is informational because it speaks only for Discourse hosting", () => {
  const service = app.healthChecks.find((c) => c.key === "service")!;
  assertEquals(service.severity, "informational");
  assertEquals(service.scope, "app");
});

Deno.test("index: the site check is per-connection, unsigned, and declares no extra egress", () => {
  const site = app.healthChecks.find((c) => c.key === "site")!;
  assertEquals(site.scope, "connection");
  // `context`: it needs the Connection to know WHICH host to call, and needs no
  // credential to interpret the answer. `sign` must not run.
  assertEquals(site.credential, "context");
  assertEquals(site.network, undefined);
  assertEquals(typeof site.check, "function");
});
