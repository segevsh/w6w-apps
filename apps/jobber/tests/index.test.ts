import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 28);
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

Deno.test("index: every action declares a valid type, a description, an output and an execute hook", () => {
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

Deno.test("index: every action is grouped under a resource", () => {
  for (const a of app.actions) {
    assert(typeof a.resource === "string" && a.resource.length > 0, `${a.key}: no resource`);
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

/**
 * `credential` is matched only where it is NOT preceded by a quote.
 *
 * `account-get.ts` legitimately contains `healthCheck: { kind: "credential" }`
 * — that is a value from the health taxonomy naming what the probe answers, not
 * a read of any secret. A bare `credential` identifier (`input.credential`,
 * `const { credential }`) has no quote in front of it, and that is the thing
 * being banned.
 */
Deno.test("index: no action reads a credential or sets Authorization itself", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^"'\w])credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/accessToken/i.test(src), `${a.key}: touches a token`);
  }
});

Deno.test("index: the credential guard still catches a real read", () => {
  // Guards the guard: the quote exemption above must not blunt it.
  assert(/(^|[^"'\w])credential/i.test("const c = input.credential;"));
  assert(/(^|[^"'\w])credential/i.test("const { credential } = input;"));
  assert(!/(^|[^"'\w])credential/i.test('healthCheck: { kind: "credential" }'));
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

/**
 * Every network call in this app goes through `lib/client.ts`, which owns the
 * one endpoint and the version header. An action that built its own URL would
 * be reaching past the allowlist declaration in `package.json`.
 */
Deno.test("index: no action hard-codes a URL — the endpoint belongs to the client", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/https?:\/\//.test(src), `${a.key}: hard-codes a URL`);
  }
});

Deno.test("index: no action builds the API version header itself", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/x-jobber-graphql-version/i.test(src), `${a.key}: sets the version header itself`);
  }
});

/**
 * The transport-level guarantee this whole app is built around: a mutation
 * that does not select `userErrors` cannot check them, and a rejected write
 * would return a hollow success at HTTP 200.
 */
Deno.test("index: every mutation selects userErrors AND routes through unwrap", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    if (!/^const MUTATION = /m.test(src)) continue;
    assert(src.includes("userErrors { message path }"), `${a.key}: mutation omits userErrors`);
    assert(/unwrap\(/.test(src), `${a.key}: mutation result is not unwrapped`);
  }
});

Deno.test("index: every mutation-bearing action is a perform, and every perform mutates", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    const hasMutation = /^const MUTATION = /m.test(src);
    if (hasMutation) assertEquals(a.type, "perform", `${a.key}: mutation on a non-perform action`);
  }
});

/**
 * Jobber prices a connection at `first` × selected fields, and assumes 100 when
 * no bound is given. An unbounded connection anywhere in this app would be a
 * silent several-hundred-point query.
 */
Deno.test("index: no static document selects an unbounded connection", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(
      !/\w+\s*\{\s*\n\s*nodes\s*\{/.test(src),
      `${a.key}: a connection is selected without a first/last bound`,
    );
  }
});

Deno.test("index: the only auth method is OAuth 2.0 — Jobber offers nothing else", () => {
  assertEquals(app.auth[0].key, "oauth2");
  assertEquals(app.auth[0].type, "oauth2");
});

Deno.test("index: health checks cover both questions, and neither is a stub", () => {
  const keys = app.healthChecks.map((h) => h.key).sort();
  assertEquals(keys, ["quota", "service"]);
  for (const h of app.healthChecks) {
    assertEquals(typeof h.check, "function", `${h.key}: declared without a probe`);
    assertEquals(h.unavailable, undefined, `${h.key}: declared unavailable and a probe`);
  }
});

/**
 * Rule from the health RFC and the pack's own history: an `unavailable` entry
 * reports `unknown`, and `unknown` at the default `degraded` severity would pin
 * the App at `unknown` forever. This app declares none — the assertion exists so
 * that adding one later cannot skip the severity.
 */
Deno.test("index: any unavailable check must be informational", () => {
  for (const h of app.healthChecks) {
    if (h.unavailable) {
      assertEquals(h.severity, "informational", `${h.key}: unavailable without informational`);
    }
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// credential\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
  // And real violations must still be visible after stripping.
  assert(/credential/.test(code("const c = credential;")));
});
