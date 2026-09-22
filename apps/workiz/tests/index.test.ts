import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 20;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
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
 * Anything that creates a record has no idempotency key in this API, so a retry
 * books it twice: a second job, a second payment, a second converted job. The
 * runtime may retry an action marked idempotent, so these must say `false`.
 */
Deno.test("index: record-creating performs are not marked idempotent", () => {
  for (const key of ["lead-create", "lead-convert", "job-create", "job-add-payment"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: an update/assign carries the whole target state, so repeating it
 * lands on the same state and saying so is what lets the runtime recover from a
 * dropped connection.
 */
Deno.test("index: state-setting performs are marked idempotent", () => {
  for (
    const key of [
      "lead-update",
      "lead-mark-lost",
      "lead-activate",
      "lead-assign",
      "lead-unassign",
      "job-update",
      "job-assign",
      "job-unassign",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
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
 * `auth_secret` is a per-record secret, and the contract that governs it is that
 * it is a normal Action input — never the connection credential. It must appear
 * on exactly the actions that take it back.
 */
Deno.test("index: exactly the record-writing actions take auth_secret", () => {
  const withSecret = app.actions
    .filter((a) => (a.params ?? []).some((p) => p.key === "authSecret"))
    .map((a) => a.key)
    .sort();
  assertEquals(withSecret, [
    "job-add-payment",
    "job-assign",
    "job-create",
    "job-unassign",
    "job-update",
    "lead-activate",
    "lead-assign",
    "lead-convert",
    "lead-create",
    "lead-mark-lost",
    "lead-unassign",
    "lead-update",
  ]);
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
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
    assert(!/api[_-]?key/i.test(src), `${a.key}: touches an API key`);
  }
});

/**
 * The credential is a path segment in this API, so the URL-shaped leak is the
 * one to guard: `/api/v1` and the token variable belong to `auth/` alone. An
 * action that built the prefix itself could also get the ordering wrong.
 */
Deno.test("index: no action builds the credential-bearing /api/v1 prefix", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/\/api\/v1/.test(src), `${a.key}: builds the /api/v1 token prefix`);
    assert(!/apiToken|api_token/i.test(src), `${a.key}: names the account token`);
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
 * The API origin lives in `lib/client.ts` and nowhere else. An action that
 * hard-coded a host — or accepted one as a param — could be pointed somewhere
 * the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/workiz\.com/.test(src), `${a.key}: contains a Workiz host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|account)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- the endpoint invariant, derived rather than listed ----------------------

/**
 * Every request path an action builds, with `${…}` interpolations collapsed to
 * `{}` — derived from the source rather than hand-listed, so a new action is
 * covered the moment it is written.
 */
function requestPaths(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/(?:`(\/[^`]*)`|"(\/[^"]*)")/g)) {
    const literal = m[1] ?? m[2];
    out.push(literal.replace(/\$\{[^}]*\}/g, "{}"));
  }
  return out;
}

/**
 * The 20 operations Workiz's own OpenAPI document declares, in its literal
 * spelling — trailing slashes included, because this API is inconsistent about
 * them (`/team/all/` has one, `/team/get/{USER_ID}` does not).
 */
const DOCUMENTED_PATHS = new Set([
  "/team/all/",
  "/team/get/{}",
  "/TimeOff/get/",
  "/TimeOff/get/{}",
  "/lead/get/{}/",
  "/lead/all/",
  "/lead/create/",
  "/lead/update/",
  "/lead/markLost/{}/",
  "/lead/activate/{}/",
  "/lead/assign/",
  "/lead/unassign/",
  "/lead/convert/",
  "/job/get/{}/",
  "/job/all/",
  "/job/create/",
  "/job/update/",
  "/job/assign/",
  "/job/unassign/",
  "/job/addPayment/{}/",
]);

/**
 * The invariant: the paths this app builds are EXACTLY the vendor's documented
 * set — no invented endpoint, no typo, and no dropped operation. A new action
 * therefore has to be a documented one, and a mistyped path fails here rather
 * than at run time.
 */
Deno.test("index: the actions build exactly the 20 documented Workiz paths", async () => {
  const built = new Set<string>();
  for (const a of app.actions) {
    for (const p of requestPaths(await actionSource(a.key))) built.add(p);
  }
  assertEquals([...built].sort(), [...DOCUMENTED_PATHS].sort());
});

// --- auth -------------------------------------------------------------------

Deno.test("index: the auth method is a token method with one required secret field", () => {
  const auth = app.auth[0];
  assertEquals(auth.key, "api-token");
  assertEquals(auth.fields?.length, 1);
  const field = auth.fields![0];
  assertEquals(field.key, "apiToken");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
  assertEquals(typeof auth.test, "function");
});

// --- health -----------------------------------------------------------------

Deno.test("index: every health check has exactly one of check/unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up, so at any severity but `informational` a declared absence pins
 * the App at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the token. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  const widening = app.healthChecks.filter((h) => h.network?.allow?.length);
  assert(widening.length > 0, "no check widens egress — this test would pass vacuously");
  for (const h of widening) {
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows exactly the two hosts the app calls", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      categories: string[];
      network: { allow: string[] };
      appearance: { icon: { svg: string } };
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.workiz");
  // Both hosts are declared and nothing else: api.workiz.com for actions/auth,
  // workiz.statuspage.io for the service check — which also declares it in its
  // own `network.allow`.
  assertEquals(manifest.w6w.network.allow, ["api.workiz.com", "workiz.statuspage.io"]);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the manifest categories are the field-service trio", () => {
  const manifest = JSON.parse(
    Deno.readTextFileSync(new URL("../package.json", import.meta.url)),
  ) as { w6w: { categories: string[] } };
  assertEquals(manifest.w6w.categories, ["calendar", "crm", "finance"]);
});

/**
 * The icon must be the vendor's own mark, used verbatim. The file is Workiz's
 * homepage logo (`workiz-logo.svg`, 7,383 bytes, verified 2026-09-22) with its
 * original canvas and its two paints untouched — a redraw would change the path
 * data, and a `deno fmt` over the file would rewrite the markup.
 */
Deno.test("index: the icon is the vendor's mark, verbatim", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assertEquals(svg.length, 7383, "icon.svg is not the vendor's file any more");
  assert(
    svg.startsWith('<svg width="123" height="40" viewBox="0 0 400 131"'),
    "icon.svg lost the vendor's canvas",
  );
  assert(svg.includes("#FFD400"), "the Workiz yellow is missing — the mark was redrawn");
  assert(svg.includes("#23282B"), "the wordmark paint is missing — the mark was redrawn");
  assert(
    svg.includes("M7.24414 65.4594C7.24414 33.3083"),
    "the vendor's geometry changed — the mark was redrawn",
  );
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
