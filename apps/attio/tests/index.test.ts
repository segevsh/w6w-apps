import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 29);
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

Deno.test("index: every param declares a label and a type", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
      assert(typeof p.type === "string" && p.type.length > 0, `${a.key}/${p.key}: no type`);
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
    assert(!/\bBearer\b/.test(src), `${a.key}: builds a bearer header itself`);
    // Belt and braces: an action has no business assembling request headers at
    // all — the client owns that, and the credential half of it is sign's.
    assert(!/\bheaders\b\s*[:=]/.test(src), `${a.key}: assembles request headers itself`);
  }
});

Deno.test("index: no action exposes the credential as a param", () => {
  const banned = ["apikey", "accesstoken", "token", "secret", "password", "authorization"];
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(
        !banned.includes(p.key.toLowerCase()),
        `${a.key}: declares a credential-ish param "${p.key}"`,
      );
      assert(p.type !== "secret", `${a.key}/${p.key}: an action must not collect a secret`);
    }
  }
});

/**
 * `GET /v2/self` is safe — its response is fifteen introspection CLAIMS about
 * the token and never the token itself, which was checked against the OpenAPI
 * document before it was used (see `auth/api-key.ts`).
 *
 * This test is the tripwire for that decision. If Attio ever adds a token-, key-
 * or secret-shaped field to that response and someone copies it into a hook's
 * return value — where it would be stored as Connection display data and
 * rendered in a UI — this fails. It scans what the app actually *stores*, which
 * is the property that matters: reading a field is harmless, persisting it is
 * not.
 */
Deno.test("index: nothing in the app copies a token-shaped field out of a response", async () => {
  const dirs = ["actions", "auth", "health", "lib"];
  // Assignment or property-shorthand of a credential-shaped name, e.g.
  // `apiKey: body.apiKey` or `token = self.access_token`.
  const leak = /\b(access_?token|api_?key|client_?secret|refresh_?token|private_?key)\b/i;
  for (const dir of dirs) {
    const base = new URL(`../${dir}/`, import.meta.url);
    for await (const entry of Deno.readDir(base)) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(await Deno.readTextFile(new URL(entry.name, base)));
      // `auth/api-key.ts` legitimately names the credential field it collects;
      // everything else must not mention one at all.
      if (dir === "auth" && entry.name === "api-key.ts") continue;
      assert(!leak.test(src), `${dir}/${entry.name}: names a credential-shaped field`);
    }
  }
});

/** The credential-leak guard must still catch a real violation. */
Deno.test("index: the credential-leak guard would catch an actual copy", () => {
  const leak = /\b(access_?token|api_?key|client_?secret|refresh_?token|private_?key)\b/i;
  assert(leak.test("return { apiKey: body.apiKey };"));
  assert(leak.test("const t = self.access_token;"));
  assert(leak.test('display.clientSecret = body["client_secret"];'));
  // …and must not fire on the harmless introspection claims we DO copy.
  assert(!leak.test("return { workspace: { id: self.workspace_id }, scopes };"));
});

/**
 * `/v2/self` answers HTTP 200 with `{"active": false}` for a revoked token —
 * verified on the wire, 2026-08-03. Anything that calls it must read the body.
 *
 * This is the app's dominant failure mode if it regresses: `res.ok` passes, the
 * connection tests green, and every subsequent action 401s. Both callers are
 * pinned here so a future "simplification" to a bare `res.ok` cannot land
 * silently.
 */
Deno.test("index: every caller of /v2/self checks `active`, not just the status", async () => {
  const callers = [
    new URL("../auth/api-key.ts", import.meta.url),
    new URL("../actions/get-identity.ts", import.meta.url),
  ];
  for (const url of callers) {
    const src = code(await Deno.readTextFile(url));
    assert(/\/self/.test(src), `${url.pathname}: expected to call /v2/self`);
    assert(
      /active\s*!==\s*true|active\s*===\s*true/.test(src),
      `${url.pathname}: calls /v2/self without checking \`active\` — a bad token returns 200`,
    );
  }
});

Deno.test("index: health checks cover service and quota, keyed and titled", () => {
  const keys = app.healthChecks.map((h) => h.key);
  assertEquals(keys.sort(), ["quota", "service"]);
  for (const h of app.healthChecks) {
    assert(h.title.length > 0, `${h.key}: no title`);
    assert(
      h.check !== undefined || h.unavailable !== undefined,
      `${h.key}: neither check nor unavailable`,
    );
  }
});

/**
 * An `unavailable` entry reports `unknown`, and at the default `degraded`
 * severity that would pin the app at `unknown` forever. Every declared-absent
 * check must therefore be `informational`.
 */
Deno.test("index: any unavailable health check is informational", () => {
  for (const h of app.healthChecks) {
    if (!h.unavailable) continue;
    assertEquals(
      h.severity,
      "informational",
      `${h.key}: unavailable checks must be informational or they pin the app at unknown`,
    );
    assert(h.unavailable.reason.length > 0, `${h.key}: unavailable without a reason`);
  }
});

/**
 * A signed health check may not widen egress — the spec binds `network.allow` to
 * an unsigned posture, because a status host is exactly the host that must never
 * see a credential.
 */
Deno.test("index: no signed health check declares its own network allowlist", () => {
  for (const h of app.healthChecks) {
    const posture = h.credential ?? (h.kind === "service" ? "none" : "signed");
    if (posture !== "signed") continue;
    assertEquals(h.network, undefined, `${h.key}: signed checks may not widen egress`);
  }
});

/**
 * Every host the app reaches must be declared. Actions may only touch
 * `api.attio.com`; the status host is widened for the one unsigned service hook
 * and must not leak into anything else.
 */
Deno.test("index: actions and lib call only api.attio.com", async () => {
  for (const dir of ["actions", "lib", "auth"]) {
    const base = new URL(`../${dir}/`, import.meta.url);
    for await (const entry of Deno.readDir(base)) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(await Deno.readTextFile(new URL(entry.name, base)));
      for (const [, host] of src.matchAll(/https:\/\/([a-z0-9.-]+)/gi)) {
        assertEquals(host, "api.attio.com", `${dir}/${entry.name}: undeclared host ${host}`);
      }
    }
  }
});
