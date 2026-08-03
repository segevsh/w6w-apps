import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 17);
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
 * The Metabase-specific half of the same rule.
 *
 * Metabase's credential is `X-API-Key`, which the generic `authorization` check
 * above would miss entirely. Both spellings of that header are banned from
 * executable action code — it belongs to `auth/api-key.ts` and nowhere else.
 *
 * `X-Metabase-Session` is banned too. It is Metabase's *other* credential
 * header — the session-token scheme this app deliberately does not implement —
 * and an action reaching for it would be improvising an auth scheme inside the
 * network-capable worker.
 */
Deno.test("index: no action builds an API-key or session header — both belong to sign", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/x-api-key/i.test(src), `${a.key}: builds X-API-Key itself`);
    assert(!/api[_-]?key/i.test(src), `${a.key}: touches the API key`);
    assert(!/x-metabase-session/i.test(src), `${a.key}: reaches for the session-token scheme`);
    assert(!/\/api\/session/i.test(src), `${a.key}: calls the login endpoint`);
  }
});

/**
 * The instance URL is half the credential's identity. It must never be
 * reachable as an action parameter, in any spelling — that would let two actions
 * on one Connection address two different Metabases, and would put
 * credential-adjacent material in the network-capable worker.
 */
Deno.test("index: the instance URL is never an action param", () => {
  const banned = /^(site_?url|base_?url|instance_?url|host|origin|domain|api_?key|token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

Deno.test("index: the credential's two parts are auth FIELDS, which is where they belong", () => {
  const fields = app.auth[0].fields ?? [];
  assertEquals(fields.map((f) => f.key), ["siteUrl", "apiKey"]);
  // The key is masked; the instance URL is an address, not a secret, and masking
  // it would make a typo impossible to spot.
  assertEquals(fields.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(fields.find((f) => f.key === "siteUrl")?.type, "string");
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

Deno.test("index: no action hard-codes an instance host — the URL comes from the Connection", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL literal`);
  }
});

/**
 * The rejected probe, kept rejected.
 *
 * `GET /api/api-key` lists the instance's API keys. It was considered and
 * rejected as an auth probe: it is admin-scoped and it exposes metadata about
 * *other people's* credentials, and `POST /api/api-key` genuinely does return an
 * `unmasked_key`. Nothing in this app may call the api-key routes or read that
 * field, in an action or anywhere else.
 */
Deno.test("index: nothing in the app touches the api-key admin routes or unmasked_key", async () => {
  const dirs = ["actions", "auth", "health", "lib"];
  for (const dir of dirs) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(
        await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url)),
      );
      assert(!/unmasked_key/.test(src), `${dir}/${entry.name}: reads unmasked_key`);
      assert(!/["'`]\/api\/api-key/.test(src), `${dir}/${entry.name}: calls the api-key routes`);
    }
  }
});

/**
 * The auth probe is pinned by path, not merely by behaviour.
 *
 * Choosing a `/me`-shaped probe is the step where a credential most easily leaks
 * back out (Follow Up Boss's `/me` returns the caller's own API key; Mailjet's
 * `/apikey` returns key and secret). Metabase's `/api/user/current` was read
 * before being adopted and returns a synthetic user record with no key material.
 * If someone later swaps it for a different endpoint, this test makes them do it
 * deliberately.
 */
Deno.test("index: the auth probe is /api/user/current", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(src.includes("/api/user/current"), "auth probe no longer hits /api/user/current");
});

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * Rule 1 of the health-check severity contract: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up. At any severity
 * but `informational`, a declared absence would pin the App at `unknown`
 * forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  for (const h of app.healthChecks.filter((h) => h.unavailable)) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/**
 * Rule 2: a live check that reports something not true of every tenant must not
 * be allowed to worsen the verdict. `status.metabase.com` covers Metabase Cloud
 * and the Metabase Store; a self-hosted instance is unaffected by both, and this
 * check is `scope: "app"` so it cannot tell the two kinds of Connection apart.
 */
Deno.test("index: the service check is informational — it speaks only for Metabase Cloud", () => {
  const service = app.healthChecks.find((h) => h.key === "service")!;
  assertEquals(service.severity, "informational");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
});

/**
 * The per-connection probe is the one that carries real weight, and it must
 * never be signed: `/api/health` is unauthenticated by design, and sending an
 * API key to it would be gratuitous exposure.
 */
Deno.test("index: the instance check is an unsigned per-connection dependency", () => {
  const instance = app.healthChecks.find((h) => h.key === "instance")!;
  assertEquals(instance.kind, "dependency");
  assertEquals(instance.scope, "connection");
  assertEquals(instance.credential, "context");
  assertEquals(instance.severity, undefined, "should keep the degraded default for its kind");
});

/**
 * `/livez` returns `{"status":"ok"}` unconditionally — its own docstring says it
 * performs no database checks. A probe that can never fail is worse than none,
 * and its name makes it the tempting wrong answer.
 *
 * The guard is on what is FETCHED, not on the word appearing anywhere: the
 * instance check's `description` names `/livez` deliberately, to tell an
 * operator why it is not used. A test that banned the string outright would
 * force that explanation to be deleted, which is the opposite of what it is for.
 */
Deno.test("index: no health check fetches /livez, which cannot fail", async () => {
  for await (const entry of Deno.readDir(new URL("../health", import.meta.url))) {
    if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../health/${entry.name}`, import.meta.url)));
    for (const call of src.matchAll(/ctx\.fetch\(([^;]*?)\)/gs)) {
      assert(!/livez|readyz/.test(call[1]), `health/${entry.name}: fetches /livez or /readyz`);
    }
  }
});

/** And the positive half: the per-connection probe really is `/api/health`. */
Deno.test("index: the instance check probes /api/health", async () => {
  const src = code(await Deno.readTextFile(new URL("../health/instance.ts", import.meta.url)));
  assert(
    /ctx\.fetch\([^;]*\/api\/health/s.test(src),
    "instance check no longer probes /api/health",
  );
});

/**
 * A check that widens egress must be unsigned — a third-party status host is
 * exactly the host that must never see a credential.
 */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  for (const h of app.healthChecks) {
    if (!h.network?.allow?.length) continue;
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// x-api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
