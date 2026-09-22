import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import { PROBE_PATH } from "../auth/api-token.ts";
import { mockCtx, pathOf, UNAUTHORISED_BODY, unauthorisedResponse } from "./_helpers.ts";

/** All 84 documented operations have an Action. See the README's coverage table. */
const ACTION_COUNT = 84;

Deno.test("index: exports every action, the one auth method and three health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
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

Deno.test("index: every action declares a type, a description, an execute hook and output", () => {
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

/**
 * The runtime may retry an action marked idempotent. Every `perform` here states
 * which side of that line it is on: a create that would duplicate a record is
 * `false`, a PUT or DELETE is `true`.
 */
Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * The two lists are the whole point of declaring idempotency: a create makes a
 * new record every time it is called, so a retry duplicates work (or an
 * invoice), while a PUT of the same fields or a DELETE of the same id lands in
 * the same end state. Nothing here is `undefined` — the test above proves that.
 */
Deno.test("index: creates are not idempotent, and PUT/DELETE actions are", () => {
  const creates = [
    "company-create",
    "company-contact-create",
    "job-create",
    "job-duplicate",
    "job-activity-entry-create",
    "job-phase-create",
    "job-item-create",
    "job-item-role-create",
    "job-item-sub-item-create",
    "job-item-user-create",
    "job-milestone-create",
    "invoice-payment-create",
    "logged-expense-create",
    "logged-time-create",
    "logged-times-create-bulk",
    "label-create",
  ];
  for (const key of creates) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }

  const repeatable = [
    "company-update",
    "contact-update",
    "job-update",
    "job-status-update",
    "job-phase-update",
    "job-phase-delete",
    "job-item-update",
    "job-item-role-update",
    "job-item-sub-item-update",
    "job-item-user-update",
    "job-item-user-delete",
    "job-milestone-update",
    "job-milestone-delete",
    "invoice-update",
    "logged-expense-update",
    "logged-time-update",
    "logged-time-delete",
    "label-delete",
  ];
  for (const key of repeatable) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

Deno.test("index: every param has a key and a label, and groups have children", () => {
  const walk = (params: readonly { key?: string; label?: string }[] | undefined) => {
    for (const p of params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, "param without a key");
      assert(typeof p.label === "string" && p.label.length > 0, `${p.key}: no label`);
    }
  };
  for (const a of app.actions) walk(a.params);
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose.
 *
 * Without this the checks are simultaneously too weak and too strong: a doc
 * comment explaining *why* an action never touches the credential trips the
 * assertion, while deleting the explanation would leave a real violation just as
 * invisible.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

Deno.test("index: no action reaches for a credential or a global fetch", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a global fetch`);
    assert(!/authorization/i.test(src), `${a.key}: sets an Authorization header`);
  }
});

/**
 * Every action path is built from `API_BASE` + `API_PREFIX`, so no action may
 * carry a hard-coded absolute URL that would slip past the egress allowlist.
 */
Deno.test("index: no action hard-codes an absolute URL", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/https?:\/\//.test(src), `${a.key}: hard-codes a URL`);
  }
});

// --- auth -------------------------------------------------------------------

Deno.test("index: the auth method is a bearer token with a live test and a sign hook", () => {
  const method = app.auth[0];
  assertEquals(method.key, "api-token");
  assertEquals(method.type, "bearer");
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
  assertEquals(method.fields?.length, 1);
  assertEquals(method.fields?.[0].type, "secret");
  assertEquals(method.fields?.[0].key, "apiToken");
  assertEquals(method.fields?.[0].required, true);
});

/**
 * The probe is pinned here as well as in the auth test file, because this is the
 * line somebody edits when they decide a shorter endpoint would do. `/organisation`
 * is the one authenticated read whose response never contains the credential.
 */
Deno.test("index: the auth probe is GET /organisation", () => {
  assertEquals(PROBE_PATH, "/organisation");
});

/**
 * The reason the whole app classifies from bodies: Streamtime returns one
 * identical sentence for a missing token, a bad token and an unknown path. This
 * test drives the real hook against that exact wire answer.
 */
Deno.test("index: a rejected credential is reported from the vendor's own words", async () => {
  const { ctx, calls } = mockCtx([unauthorisedResponse()]);
  const result = await app.auth[0].test!({ credential: { apiToken: "not-real" } }, ctx);

  assertEquals(result.ok, false);
  assertEquals(pathOf(calls[0].url), "/v2/organisation");
  assert(result.message?.includes(UNAUTHORISED_BODY), result.message);
  assert(!result.message?.includes("not-real"), "the credential was echoed back");
});

// --- health -----------------------------------------------------------------

Deno.test("index: every health check probes or declares an absence, never both", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in a roll-up, so at any severity but `informational` a declared absence pins
 * the whole App at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assertEquals(unavailable.length, 1, "expected the declared absence of a quota surface");
  assertEquals(unavailable[0].key, "quota");
  assertEquals(unavailable[0].severity, "informational");
});

/** A check that widens egress must be unsigned — a status host never sees the token. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  const widening = app.healthChecks.filter((h) => h.network?.allow?.length);
  assertEquals(widening.length, 1);
  for (const h of widening) {
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

Deno.test("index: the credential check is the only signed one", () => {
  const signed = app.healthChecks.filter((h) => h.credential === "signed");
  assertEquals(signed.map((h) => h.key), ["credential"]);
  assertEquals(signed[0].kind, "credential");
});

// --- manifest ---------------------------------------------------------------

Deno.test("index: the manifest declares exactly the hosts the app calls", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      network: { allow: string[] };
      appearance: { icon: { svg: string; alt: string } };
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.streamtime");
  assertEquals(manifest.w6w.network.allow, [
    "api.streamtime.net",
    "streamtime.statuspage.io",
  ]);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
  assertEquals(manifest.w6w.appearance.icon.alt, "Streamtime");
});

/**
 * The icon is the vendor's own mark, saved verbatim from the URL the Streamtime
 * homepage links in its `<head>`. `streamtime.net/favicon.svg` and
 * `apple-touch-icon.png` both 404 (the site is Webflow) — a redraw or a
 * conventional-path fallback would be a different picture, which is what these
 * assertions catch.
 */
Deno.test("index: the icon is the vendor's mark, unmodified", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assertEquals(
    svg.length,
    2493,
    "icon.svg is not the 2,493-byte file fetched from the vendor's CDN",
  );
  assert(
    svg.includes('viewBox="0 0 32 32"'),
    "the vendor's 32x32 canvas is gone — the mark was re-framed",
  );
  assert(svg.includes("M7.3998 27.5002"), "the vendor's geometry changed — the mark was redrawn");
  assert(svg.includes('fill="#FFDE3B"'), "the vendor's yellow (#FFDE3B) is missing");
  assert(svg.includes('fill="white"'), "the vendor's white tile is missing");
});

Deno.test("index: the comment stripper actually strips, so the guards mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
