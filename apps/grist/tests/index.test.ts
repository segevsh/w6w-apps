import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 15);
  assertEquals(app.auth.length, 2);
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
    assert(!/\bapiKey\b|accessToken/i.test(src), `${a.key}: names a credential field`);
  }
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

/**
 * The Grist-specific half of the rule. The site URL is per-Connection, and an
 * action that hard-coded a host — or took one as a parameter — would let two
 * steps on one Connection talk to different servers, and would let a workflow
 * author point a signed request anywhere.
 */
Deno.test("index: no action hard-codes a Grist host, and none takes a site as a param", async () => {
  const banned = /^(site_?url|base_?url|host|origin|server|instance_?url)$/i;
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/getgrist\.com/i.test(src), `${a.key}: hard-codes a getgrist.com host`);
    assert(!/https?:\/\//.test(src), `${a.key}: builds an absolute URL itself`);
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: the connection's host leaked into params`);
    }
  }
});

Deno.test("index: every action resolves its base URL from the Connection", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(
      /GristClient\.fromConnection\(ctx\)/.test(src),
      `${a.key}: does not build its client from the Connection`,
    );
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// credential\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
  // And real violations must still be visible after stripping.
  assert(/credential/.test(code("const c = credential;")));
  assert(/getgrist\.com/.test(code('const u = "https://docs.getgrist.com";')));
});

Deno.test("index: auth offers the API key first, then OAuth", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key", "oauth2"]);
  // Both carry the site URL, because a credential is only valid on one site.
  for (const a of app.auth) {
    assert(a.fields?.some((f) => f.key === "siteUrl"), `${a.key}: no siteUrl field`);
  }
});

Deno.test("index: health checks cover service, dependency and quota", () => {
  const byKey = Object.fromEntries(app.healthChecks.map((c) => [c.key, c]));
  assertEquals(byKey.service.kind, "service");
  assertEquals(byKey.site.kind, "dependency");
  assertEquals(byKey.quota.kind, "quota");
});

/**
 * The rule this pack got wrong three times before. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up — so at the
 * default `degraded` severity a declared absence would pin the App at `unknown`
 * forever.
 */
Deno.test("index: every unavailable check is informational, with a real reason", () => {
  for (const c of app.healthChecks.filter((c) => c.unavailable)) {
    assertEquals(c.severity, "informational", `${c.key}: unavailable but not informational`);
    assert((c.unavailable!.reason ?? "").length > 40, `${c.key}: reason is not a real explanation`);
    assertEquals(c.check, undefined, `${c.key}: declares both unavailable and a probe`);
    // Nothing to reach means nothing to widen egress for.
    assertEquals(c.network, undefined, `${c.key}: unavailable but widens egress`);
  }
});

Deno.test("index: service and quota are both declared unavailable, not omitted", () => {
  const byKey = Object.fromEntries(app.healthChecks.map((c) => [c.key, c]));
  assert(byKey.service.unavailable, "service must be declared, even as absent");
  assert(byKey.quota.unavailable, "quota must be declared, even as absent");
});

Deno.test("index: no health check widens egress, because the allowlist is already *", () => {
  for (const c of app.healthChecks) {
    assertEquals(c.network, undefined, `${c.key}: widens egress unnecessarily`);
  }
});

Deno.test("index: the only probing check is unsigned", async () => {
  const probes = app.healthChecks.filter((c) => typeof c.check === "function");
  assertEquals(probes.map((c) => c.key), ["site"]);
  assertEquals(probes[0].credential, "context");
  // Drop the `credential: "context"` posture declaration before scanning — it
  // is the thing that PREVENTS a credential, not a use of one.
  const src = code(await Deno.readTextFile(new URL("../health/site.ts", import.meta.url)))
    .replace(/credential:\s*"[a-z]+",?/g, "");
  assert(!/credential/i.test(src), "the site probe must not touch a credential");
  assert(!/authorization/i.test(src), "the site probe must not set an auth header");
});
