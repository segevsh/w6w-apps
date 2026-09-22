import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

/** The thirteen Actions this app publishes — no more, no fewer. */
const EXPECTED_ACTION_KEYS = [
  "backlinks-overview-get",
  "backlinks-historical-summary-get",
  "backlinks-list-get",
  "backlinks-referring-domains-get",
  "backlinks-referring-ips-get",
  "backlinks-pages-get",
  "backlinks-anchors-get",
  "backlinks-score-profile-get",
  "backlinks-competitors-get",
  "backlinks-summary-comparison-get",
  "backlinks-matrix-get",
  "keyword-metrics-get",
  "api-units-balance-get",
];

Deno.test("index: exports the thirteen actions, one auth method and one health check", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 13);
  assertEquals(app.actions.map((a) => a.key).sort(), [...EXPECTED_ACTION_KEYS].sort());
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 1);
  assertEquals(app.healthChecks[0].key, "service");
});

Deno.test("index: every action is a read, with a description, an execute hook and output", () => {
  for (const a of app.actions) {
    assertEquals(a.type, "read", `${a.key}: not a read`);
    assert(typeof a.description === "string" && a.description.length > 0, `${a.key}: no desc`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: each Standard-API action surfaces the vendor's `data` field", () => {
  for (const a of app.actions) {
    const fields = Array.isArray(a.output) ? a.output : [];
    const keys = fields.map((o) => o.key);
    if (a.key === "api-units-balance-get") {
      // Not a Standard-API call: its output is the balance itself.
      assertEquals(keys, ["balance"], a.key);
    } else {
      assertEquals(keys, ["data"], `${a.key}: output should carry the vendor's data field`);
    }
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
 * comment explaining why an Action never touches the credential trips the
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
 * Hosts live in `lib/client.ts` and nowhere else. An Action that hard-coded a
 * host — or accepted one as a param — could be pointed somewhere the manifest
 * never allowlisted.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/semrush\.com/.test(src), `${a.key}: contains a SEMrush host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|base_?url|api_?key|api_?token|token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

Deno.test("index: no action exposes a `format` param — `json` is the only projection used", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(p.key !== "format", `${a.key}: exposes the vendor's CSV/JSON switch`);
    }
  }
});

// --- auth ------------------------------------------------------------------

Deno.test("index: the single auth method declares the `Apikey` header scheme", () => {
  const auth = app.auth[0];
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "Authorization", prefix: "Apikey " });
  assertEquals(typeof auth.sign, "function");
  assertEquals(typeof auth.test, "function");
});

/**
 * The file that touches the free balance endpoint must never return the
 * vendor's own error text: it contains the submitted key. This is the one
 * finding from this app's research that a reviewer checks for explicitly, so it
 * is asserted at the source level as well as behaviourally (see
 * `tests/auth/api-key.test.ts` and `tests/actions/api-units-balance-get.test.ts`).
 */
Deno.test("index: the balance-path code never reads the vendor's error message", async () => {
  const auth = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  // `errorField` reads the sibling `field` name (safe) and never `message`.
  assert(auth.includes("errors?.[0]?.field"), "errorField no longer reads the `field` name");
  assert(!/\.message\b/.test(auth), "auth/api-key.ts reads a vendor `message` field");
  // The Action never parses a balance response body itself — lib/client.ts does,
  // and discards the body entirely on failure.
  const action = await actionSource("api-units-balance-get");
  assert(!/res\.text|res\.json/.test(action), "api-units-balance-get: reads the vendor body");
});

// --- health ----------------------------------------------------------------

Deno.test("index: the health check declares the absence-of-status-page posture", () => {
  const service = app.healthChecks[0];
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.severity, "informational");
  assertEquals(service.unavailable, undefined);
  assertEquals(typeof service.check, "function");
});

Deno.test("index: no health check declares extra egress while signed", () => {
  for (const check of app.healthChecks) {
    if (!check.network?.allow?.length) continue;
    assert(
      check.credential === "none" || check.credential === "context",
      `${check.key}: widens egress while signed`,
    );
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows exactly the two hosts the app calls", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } };
  };
  assertEquals(manifest.w6w.id, "io.w6w.semrush");
  assertEquals(manifest.w6w.network.allow.sort(), ["api.semrush.com", "www.semrush.com"]);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is simple-icons' SEMrush mark, byte-for-byte", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from
  // https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/semrush.svg on
  // 2026-09-22: 929 bytes, `image/svg+xml`, `<title>Semrush</title>`.
  assertEquals(svg.length, 929);
  assert(svg.startsWith('<svg role="img" viewBox="0 0 24 24"'), "the canvas was rewritten");
  assert(svg.includes("<title>Semrush</title>"), "the vendor title is missing");
  assert(svg.includes("M20.698 11.911c0 .444-.226.516-.79.516"), "the mark was redrawn");
});

Deno.test("index: the dark-mode variant re-inks the mark, it does not redraw it", async () => {
  const light = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  const dark = await Deno.readTextFile(new URL("../assets/icon.dark.svg", import.meta.url));
  // A one-colour black mark is invisible on the dark tile; the pack's sanctioned
  // fix paints the SAME geometry white. Only the root `fill` differs.
  assertEquals(dark, light.replace("<svg ", '<svg fill="#ffffff" '));
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
