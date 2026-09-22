import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

/**
 * The 27 operations chosen for this build, pinned by key. Derived from the
 * OpenAPI document's own tags — Tenant, Messages, Contacts, Contact Lists,
 * Contact Segments, Custom Fields, Campaigns, Webhooks — and frozen here so a
 * dropped action and a scope creep both fail loudly.
 */
const EXPECTED_KEYS = [
  // Tenant
  "tenant-info-get",
  "phone-list",
  // Messages
  "message-send",
  "message-evaluate",
  "message-list",
  "message-get",
  // Contacts
  "contact-list",
  "contact-create",
  "contact-get",
  "contact-update",
  "contact-delete",
  // Contact lists
  "contact-list-list",
  "contact-list-create",
  "contact-list-get",
  "contact-list-update",
  "contact-list-delete",
  "contact-list-add-contact",
  "contact-list-remove-contact",
  // Segments and custom fields
  "segment-list",
  "custom-field-list",
  // Campaigns
  "campaign-list",
  "campaign-send",
  "campaign-get",
  // Webhooks
  "webhook-list",
  "webhook-create",
  "webhook-update",
  "webhook-delete",
];

Deno.test("index: exports the 27 chosen actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, EXPECTED_KEYS.length);
  assertEquals(app.actions.map((a) => a.key).sort(), EXPECTED_KEYS.slice().sort());
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

Deno.test("index: every action declares a type, a title, a description and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(typeof a.title === "string" && a.title.length > 0, `${a.key}: no title`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
    assert(typeof a.resource === "string", `${a.key}: no resource grouping`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * The classification that matters most in this app.
 *
 * A retried send is a second SMS delivered to a real person's phone and a second
 * charge; a retried create is a second object; a retried webhook is every event
 * delivered twice forever. None of those endpoints declares an idempotency key,
 * so none of them may be marked retryable. The deletes and the PUT genuinely are
 * — the end state is the same after one call or five.
 */
Deno.test("index: nothing that creates, sends or subscribes is marked idempotent", () => {
  for (
    const key of [
      "message-send",
      "campaign-send",
      "contact-create",
      "contact-list-create",
      "contact-list-add-contact",
      "webhook-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: the deletes and updates, whose end state is stable, are idempotent", () => {
  for (
    const key of [
      "contact-update",
      "contact-delete",
      "contact-list-update",
      "contact-list-delete",
      "contact-list-remove-contact",
      "webhook-update",
      "webhook-delete",
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
 * Strip comments so the sandbox guards below scan CODE, not prose. Without this
 * the checks are simultaneously too weak and too strong: a doc comment
 * explaining *why* an action never touches the credential trips the assertion,
 * while deleting the explanation would leave a real violation just as invisible.
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
 * The two hosts this app touches — the API origin and the status page — are
 * declared in exactly one place each (`lib/client.ts` and `health/service.ts`),
 * never in an action. A host literal in an action is how a request ends up
 * somewhere the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/simpletexting\.com/.test(src), `${a.key}: contains a SimpleTexting host literal`);
    for (const m of src.matchAll(/https:\/\/([a-z0-9.-]+)/gi)) {
      assert(m[1].endsWith("example.com"), `${a.key}: contains the absolute URL host ${m[1]}`);
    }
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

// --- auth ------------------------------------------------------------------

Deno.test("index: there is one apiKey method, with a secret field and both hooks", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "apiKey");
  assertEquals(method.apiKey, { in: "header", name: "Authorization", prefix: "Bearer " });
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

/**
 * The probe is pinned, and so is the reason it must stay the tenant endpoint.
 * Both credential failures are HTTP 401 there (verified live), the body's
 * `errorCode` separates them, and the response is `{email}` — no credential
 * material to copy into the health surface.
 */
Deno.test("index: the auth probe is /api/tenant", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(src.includes('PROBE_PATH = "/api/tenant"'), "the probe is no longer /api/tenant");
});

/**
 * The three `/report/*` operations are unauthenticated in the document
 * (`"security": []`), so a probe against one of them would answer 200 with no
 * token attached. Nothing may use them.
 */
Deno.test("index: nothing in auth or health probes the unauthenticated /report/* surface", async () => {
  for (const dir of ["auth", "health"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(
        await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url)),
      );
      assert(!/\/v2\/report\//.test(src), `${dir}/${entry.name}: reaches the report surface`);
    }
  }
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

// --- manifest and icon ------------------------------------------------------

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    name: string;
    w6w: {
      id: string;
      network: { allow: string[] };
      appearance: { icon: { svg: string; alt?: string } };
      categories: string[];
    };
  };
  assertEquals(manifest.name, "@w6w-apps/simpletexting");
  assertEquals(manifest.w6w.id, "io.w6w.simpletexting");
  assertEquals(manifest.w6w.network.allow, ["api-app2.simpletexting.com"]);
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.simpletexting.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
  assertEquals(manifest.w6w.appearance.icon.alt, "SimpleTexting");
  assert(
    manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3,
    "1–3 categories",
  );
});

/**
 * The icon is the vendor's own mark, base64-embedded as a PNG inside an SVG
 * wrapper (the pattern this pack uses for a vendor that ships no vector mark):
 * `simpletexting.com/favicon.svg` 404s, so the mark came from the site's
 * `apple-touch-icon.png` (180x180, 2,828 bytes) and was embedded verbatim. This
 * test asserts the wrapper still holds vendor raster data at the vendor's size —
 * it does not re-encode, re-derive or redraw anything.
 */
Deno.test("index: the icon is the vendor's mark, embedded verbatim", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'), "icon.svg is not an SVG");
  assert(svg.includes('viewBox="0 0 180 180"'), "the mark is no longer on its 180x180 canvas");
  assert(svg.includes('aria-label="SimpleTexting"'), "the mark lost its accessible name");
  assert(
    /href="data:image\/png;base64,iVBOR/.test(svg),
    "the embedded raster is gone — the vendor's mark was redrawn",
  );
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
