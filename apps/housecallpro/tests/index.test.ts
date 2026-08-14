import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 39;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
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
  const performs = app.actions.filter((a) => a.type === "perform");
  assert(performs.length > 0, "no perform actions — this test would pass vacuously");
  for (const a of performs) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * Housecall Pro accepts no idempotency key on any endpoint — there is no
 * `Idempotency-Key` header and no client-supplied dedupe token anywhere in the
 * reference. So every action that CREATES a record is `idempotent: false`: the
 * runtime may retry an action marked idempotent, and marking any of these true
 * would turn one dropped connection into two customers, two jobs, or two notes
 * on a job.
 */
Deno.test("index: no record-creating action is marked idempotent", () => {
  for (
    const key of [
      "customer-create",
      "customer-address-create",
      "job-create",
      "job-line-item-create",
      "job-note-create",
      "lead-create",
      "lead-convert",
      "tag-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse, and the reason the list above is not just caution: these five
 * genuinely are safe to retry — each sets a state rather than appending a
 * record — and saying so is what lets the runtime recover from a dropped
 * connection instead of failing the run.
 */
Deno.test("index: the five genuinely-retryable performs are marked idempotent", () => {
  for (
    const key of [
      "customer-update",
      "job-schedule-update",
      "job-dispatch",
      "job-tag-add",
      "estimate-option-approve",
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

Deno.test("index: no action declares the same param key twice", () => {
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
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
    assert(!/api[_-]?key/i.test(src), `${a.key}: touches an API key`);
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
    assert(!/housecallpro\.com/.test(src), `${a.key}: contains a Housecall Pro host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|account|secret)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- the array-serialization invariant, derived rather than listed ----------

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

Deno.test("index: the request-path derivation actually finds paths", async () => {
  const src = await actionSource("job-get");
  assert(
    requestPaths(src).includes("/jobs/{}"),
    "requestPaths no longer recognises a template-literal path — the derivation below is blind",
  );
  assertEquals(requestPaths('const p = "/company";'), ["/company"]);
  assertEquals(requestPaths("const p = `/jobs/${id}/line_items`;"), ["/jobs/{}/line_items"]);
});

/**
 * The one place a host is allowed to appear, checked both ways.
 *
 * Every action reaches the network through `lib/client.ts`, so `API_BASE` is the
 * only host literal in the app's non-auth, non-health source. The second half is
 * what stops this decaying: if an action ever built a URL itself, the guard
 * above would catch it, and this asserts the derivation that guard depends on
 * covers every action rather than silently matching none.
 */
Deno.test("index: every action's paths are relative, and every action builds at least one", async () => {
  for (const a of app.actions) {
    const paths = requestPaths(await actionSource(a.key));
    assert(paths.length > 0, `${a.key}: no request path found — is it calling the API at all?`);
    for (const p of paths) assert(p.startsWith("/"), `${a.key}: non-relative path ${p}`);
  }
});

/**
 * The array-parameter decision, pinned.
 *
 * `buildQuery` sends `name[]=a&name[]=b`, chosen over the OAS-default
 * `name=a&name=b` because the vendor's only prose about the wire format uses
 * brackets and the backend is Rails, whose parser keeps only the last value of a
 * repeated bare key. That would silently narrow a multi-value filter and still
 * return 200. If someone switches it, this makes them do it deliberately.
 */
Deno.test("index: array query parameters are serialized with brackets", async () => {
  const src = code(await Deno.readTextFile(new URL("../lib/client.ts", import.meta.url)));
  assert(
    /params\.append\(`\$\{key\}\[\]`/.test(src),
    "buildQuery no longer appends a bracketed key — every array filter silently narrows",
  );
});

// --- auth ------------------------------------------------------------------

/**
 * The auth probe is pinned by path.
 *
 * `/company` is one of the 31 operations whose `security` lists all three
 * credential kinds. Fourteen operations list only the Application API Key and
 * the OAuth token, and probing any of them would report a Pro's own working key
 * as broken.
 */
Deno.test("index: both auth methods probe /company, from one constant", async () => {
  const apiKeySrc = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(
    /export const PROBE_PATH = "\/company";/.test(apiKeySrc),
    "the probe was moved off /company, which every credential kind can reach",
  );

  // The OAuth method imports that constant rather than restating the path, so
  // the two probes cannot drift apart — a stronger claim than each file merely
  // containing the string.
  const oauthSrc = code(await Deno.readTextFile(new URL("../auth/oauth.ts", import.meta.url)));
  assert(
    /import \{[^}]*\bPROBE_PATH\b[^}]*\} from "\.\/api-key\.ts";/.test(oauthSrc),
    "auth/oauth.ts no longer shares PROBE_PATH with auth/api-key.ts",
  );
  assert(
    !/"\/[a-z_]+"/.test(oauthSrc.split("async test(")[1] ?? ""),
    "auth/oauth.ts's test hook hard-codes a path instead of using PROBE_PATH",
  );
});

/**
 * The prefixes are not interchangeable on this API: `Token ` for an API key,
 * `Bearer ` for an OAuth token. Swapping them produces a 401 that reads exactly
 * like a revoked credential, which is the single most expensive mistake
 * available here.
 */
Deno.test("index: the api-key method signs with Token and the oauth method with Bearer", async () => {
  const apiKeySrc = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  const oauthSrc = code(await Deno.readTextFile(new URL("../auth/oauth.ts", import.meta.url)));

  assert(/`Token \$\{/.test(apiKeySrc), "the api-key method no longer signs with `Token `");
  assert(!/`Bearer \$\{/.test(apiKeySrc), "the api-key method builds a Bearer header");
  assert(/`Bearer \$\{/.test(oauthSrc), "the oauth method no longer signs with `Bearer `");
  assert(!/`Token \$\{/.test(oauthSrc), "the oauth method builds a Token header");
});

Deno.test("index: the api-key credential field is declared secret", () => {
  const method = app.auth.find((m) => m.key === "api-key")!;
  assertEquals(method.type, "apiKey");
  assert((method.fields ?? []).length > 0, "no fields — this test would pass vacuously");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
});

Deno.test("index: every auth method has both test and sign", () => {
  for (const m of app.auth) {
    assertEquals(typeof m.test, "function", `${m.key}: no test hook`);
    assertEquals(typeof m.sign, "function", `${m.key}: no sign hook`);
  }
});

/**
 * The OAuth authorization host is deliberately absent from `network.allow`: no
 * Action calls it, and the host allowlists OAuth endpoint hosts implicitly.
 */
Deno.test("index: the oauth hosts are the two the vendor documents, and differ", () => {
  const method = app.auth.find((m) => m.key === "oauth2")!;
  assertEquals(method.oauth2?.authorizationUrl, "https://pro.housecallpro.com/oauth/authorize");
  assertEquals(method.oauth2?.tokenUrl, "https://api.housecallpro.com/oauth/token");
  assert(method.oauth2!.authorizationUrl !== method.oauth2!.tokenUrl);
});

// --- health ----------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
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

/** A check that widens egress must be unsigned — a status host never sees the credential. */
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

/**
 * No health check may spend a user's credential. Housecall Pro publishes no
 * rate-limit headroom at all (see `health/quota.ts`), so there is no budget to
 * measure a probe against — and the credential's liveness is already answered by
 * the two derived `auth:*` checks.
 */
Deno.test("index: no health check is signed", () => {
  for (const h of app.healthChecks) {
    assert(h.credential !== "signed", `${h.key}: probes with the user's credential`);
  }
});

// --- manifest --------------------------------------------------------------

async function manifest() {
  return JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      categories: string[];
      network: { allow: string[] };
      appearance: { icon: { url?: string; svg?: string } };
    };
  };
}

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const m = await manifest();
  assertEquals(m.w6w.id, "io.w6w.housecallpro");
  assertEquals(m.w6w.network.allow, ["api.housecallpro.com"]);
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!m.w6w.network.allow.includes("status.housecallpro.com"));
  // The OAuth authorization host is allowlisted implicitly by the runtime.
  assert(!m.w6w.network.allow.includes("pro.housecallpro.com"));
  // Nothing local: an app that reaches loopback in production is a bug.
  assert(!m.w6w.network.allow.includes("127.0.0.1"));
});

Deno.test("index: the manifest declares 1-3 categories", async () => {
  const { w6w } = await manifest();
  assert(w6w.categories.length >= 1 && w6w.categories.length <= 3);
  assertEquals(w6w.categories, ["crm", "calendar", "finance"]);
});

/**
 * The icon is Housecall Pro's own `apple-touch-icon.png`, downloaded verbatim
 * from `https://www.housecallpro.com/apple-touch-icon.png` on 2026-08-11: 4,002
 * bytes, `image/png`, 180x180 RGBA, md5 `5e2761c440ee7f4572766682283da4ad`.
 *
 * A genuine vendor SVG exists and was deliberately NOT used —
 * `https://static-assets.housecallpro.com/brand/logos/square-door-only.svg`,
 * 1,035 bytes, md5 `fe1537f2af8cc68f208b839e49652b5e`, the file Housecall Pro's
 * own documentation site names as its `logoUrl`. It declares `width` and
 * `height` and **no `viewBox`**, so it cannot be scaled into an icon slot
 * without editing it, and editing it would forfeit the verbatim claim.
 */
Deno.test("index: the icon is the vendor's file, byte-for-byte", async () => {
  const { w6w } = await manifest();
  // `url` is ImageObject's raster slot — a `png` key is silently invisible to the
  // host's asset inliner, which is how this app once shipped with no icon at all.
  assertEquals(w6w.appearance.icon.url, "./assets/icon.png");
  assertEquals(w6w.appearance.icon.svg, undefined);

  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  assertEquals(bytes.length, 4002, "icon.png is no longer the 4,002-byte vendor file");

  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  assertEquals(
    hex,
    "b0a379bd19cde48a786300bda3454eec5f9b60c85e518418f791a2003f8c5b6a",
    "icon.png bytes changed — it is no longer the file downloaded from housecallpro.com",
  );
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
