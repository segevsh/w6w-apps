import { assert, assertEquals } from "@std/assert";
import type { Param } from "@w6w/types";
import app from "../index.ts";

const ACTION_COUNT = 23;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth?.length, 1);
  assertEquals(app.healthChecks?.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares type, title, description and execute", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(typeof a.title === "string" && a.title.length > 0, `${a.key}: no title`);
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
 * SendFox accepts no idempotency key on any write, so a retry of a create makes a
 * second resource. `campaign-send` is stronger still: a retry sends against a
 * campaign whose state has already changed.
 */
Deno.test("index: no resource-creating or sending action is marked idempotent", () => {
  for (
    const key of [
      "contact-create",
      "contact-tag-create",
      "campaign-create",
      "campaign-send",
      "list-create",
      "form-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: these genuinely are safe to retry, and saying so is what lets the
 * runtime recover from a dropped connection instead of failing the run.
 */
Deno.test("index: the vendor-documented idempotent writes are marked idempotent", () => {
  const keys = [
    "contact-update",
    "contact-delete",
    "contact-tag-add",
    "contact-tag-remove",
    "list-contacts-add",
  ];
  for (const key of keys) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

Deno.test("index: every param has a key and a label", () => {
  const walk = (params: readonly Param[] | undefined) => {
    for (const p of params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, "param without a key");
      assert(typeof p.label === "string" && p.label.length > 0, `${p.key}: no label`);
      walk(p.children);
    }
  };
  for (const a of app.actions) walk(a.params);
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

/**
 * Further strip user-facing prose (labels, hints, placeholders), because a URL in
 * a placeholder is documentation, not a request — the same carve-out the pack's
 * own audit makes.
 */
const PROSE_KEYS = "hint|description|placeholder|label|title|subtitle";
const PROSE_STRING = `"[^"]*"|'[^']*'`;
const PROSE_RE = new RegExp(
  `\\b(?:${PROSE_KEYS}):\\s*(?:${PROSE_STRING})(?:\\s*\\+\\s*(?:${PROSE_STRING}))*`,
  "g",
);

function codeOnly(src: string): string {
  return code(src).replace(PROSE_RE, "");
}

const actionSource = async (key: string) =>
  await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url));

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = code(await actionSource(a.key));
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
    assert(!/api[_-]?key/i.test(src), `${a.key}: touches an API key`);
  }
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = code(await actionSource(a.key));
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

/**
 * The API origin lives in `lib/client.ts` and nowhere else. An action that
 * hard-coded a host — or accepted one as a param — could be pointed somewhere the
 * manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a host or an absolute URL", async () => {
  for (const a of app.actions) {
    const src = codeOnly(await actionSource(a.key));
    assert(!/sendfox\.com/i.test(src), `${a.key}: contains a SendFox host literal`);
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

// --- health checks ----------------------------------------------------------

Deno.test("index: every health check has a title and exactly one of check/unavailable", () => {
  for (const h of app.healthChecks ?? []) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok` in
 * the roll-up, so at any severity but `informational` a declared absence pins the
 * App at `unknown` forever.
 */
Deno.test("index: the declared absence is informational", () => {
  const unavailable = (app.healthChecks ?? []).filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

Deno.test("index: the quota check is signed and declares no extra egress", () => {
  const quota = (app.healthChecks ?? []).find((h) => h.key === "quota");
  assertEquals(quota?.credential, "signed");
  assertEquals(quota?.network, undefined);
});

// --- manifest --------------------------------------------------------------

/**
 * `deno.json` is read as text rather than imported, because the fmt/validate
 * tasks are what the pack's tooling keys off and a JSON.parse is the cheapest way
 * to assert they are wired to this app's name.
 */
Deno.test("index: deno.json names this app and points validate at it", async () => {
  const config = JSON.parse(
    await Deno.readTextFile(new URL("../deno.json", import.meta.url)),
  ) as { name: string; tasks: { validate: string; fmt: string } };

  assertEquals(config.name, "@w6w-apps/sendfox");
  assert(config.tasks.validate.endsWith("audit.ts sendfox"), config.tasks.validate);
  // `deno task fmt`, never bare `deno fmt` — the bare form rewrites assets/icon.svg.
  assert(!config.tasks.fmt.includes("assets"), config.tasks.fmt);
});

Deno.test("index: the manifest allows the API host and not the marketing host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } };
  };

  assertEquals(manifest.w6w.id, "io.w6w.sendfox");
  assert(manifest.w6w.network.allow.includes("api.sendfox.com"));
  assert(!manifest.w6w.network.allow.includes("sendfox.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's raster mark on the pack's wrapper", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from sendfox.com/apple-touch-icon.png on 2026-09-22:
  // 2,901 bytes, PNG, 180x180. Only a raster mark is published (favicon.svg
  // 404s), so the wrapper embeds the PNG — the same treatment blandai and
  // capsulecrm use. What has to be the vendor's is the bytes inside, which is
  // why this asserts the data URI rather than any particular geometry.
  assert(
    svg.startsWith(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">',
    ),
    "icon.svg is not on the pack's wrapper",
  );
  assert(svg.includes('href="data:image/png;base64,iVBORw0KGgo'), "the embedded mark is not a PNG");
  assert(svg.trimEnd().endsWith("</svg>"), "icon.svg is truncated");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
