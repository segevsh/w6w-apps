import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 23;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth?.length, 2);
  assertEquals(app.healthChecks?.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description, execute and output", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * LinkedIn documents no create-time dedupe key on any of these — a retry
 * would create a second Ad Account / Campaign Group / Campaign / Creative /
 * Audience Segment.
 */
Deno.test("index: no create action is marked idempotent", () => {
  for (
    const key of [
      "ad-account-create",
      "campaign-group-create",
      "campaign-create",
      "creative-create",
      "audience-segment-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/** A `PARTIAL_UPDATE`/`$set` patch is safe to retry: the end state is the same. */
Deno.test("index: partial-update actions are marked idempotent", () => {
  for (
    const key of [
      "campaign-group-update",
      "campaign-update",
      "campaign-delete",
      "creative-update",
      "audience-segment-update",
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
 * Strip comments so the sandbox guards below scan CODE, not prose — a doc
 * comment explaining *why* an action never touches the credential would
 * otherwise trip the very assertion it's explaining.
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
 * hard-coded a host — or accepted one as a param — could be pointed
 * somewhere the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a host or an absolute URL", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/linkedin\.com/.test(src), `${a.key}: contains a LinkedIn host literal`);
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

// --- auth --------------------------------------------------------------

Deno.test("index: two auth methods, split by which LinkedIn program they need", () => {
  assertEquals(app.auth?.map((m) => m.key), ["oauth2", "oauth2-audiences"]);
  for (const m of app.auth ?? []) {
    assertEquals(m.type, "oauth2");
    assertEquals(typeof m.test, "function");
    assertEquals(typeof m.sign, "function");
    assertEquals(m.oauth2?.pkce, false);
  }
});

Deno.test("index: the base method does not request the separately-gated Audiences scope", () => {
  const [base] = app.auth ?? [];
  assert(!base.oauth2?.scopes?.includes("rw_dmp_segments"), "base method leaked rw_dmp_segments");
});

Deno.test("index: only the Matched Audiences actions require the audiences auth method's scope", () => {
  const audienceKeys = app.actions.filter((a) => a.resource === "audience-segment").map((a) =>
    a.key
  );
  assertEquals(audienceKeys.sort(), [
    "audience-segment-create",
    "audience-segment-delete",
    "audience-segment-get",
    "audience-segment-list",
    "audience-segment-update",
  ]);
});

// --- health --------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks ?? []) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks
 * `ok` in the roll-up, so at any severity but `informational` a declared
 * absence pins the App at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = (app.healthChecks ?? []).filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the token. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  const widening = (app.healthChecks ?? []).filter((h) => h.network?.allow?.length);
  assert(widening.length > 0, "no check widens egress — this test would pass vacuously");
  for (const h of widening) {
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.linkedin-ads");
  assert(manifest.w6w.network.allow.includes("api.linkedin.com"));
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("www.linkedin-apistatus.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is LinkedIn's own mark, byte-identical to the sibling linkedin app's", async () => {
  const [ours, sibling] = await Promise.all([
    Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url)),
    Deno.readTextFile(new URL("../../linkedin/assets/icon.svg", import.meta.url)),
  ]);
  assertEquals(ours, sibling);
  assert(ours.includes("#0177b5"), "vendor colour missing — the mark was redrawn");
  assert(ours.includes("M59.26 0H4.724"), "the vendor's geometry changed — the mark was redrawn");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
