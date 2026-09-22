import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import { API_ROOT } from "./_helpers.ts";

const ACTION_COUNT = 12;

/** The two actions GIPHY documents as searches; everything else is a plain read. */
const SEARCH_ACTIONS = ["search-gifs", "search-stickers"];

Deno.test("index: exports 12 actions, one auth method and one health check", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 1);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description, an execute and an output", () => {
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
 * GIPHY's documented write path is an upload that needs a non-`api_key`
 * authenticated GIPHY-channel flow, so nothing in this surface is a `perform`.
 */
Deno.test("index: the app is read-only — no action is a perform", () => {
  assertEquals(app.actions.filter((a) => a.type === "perform"), []);
});

Deno.test("index: exactly the two search endpoints are typed as searches", () => {
  const searches = app.actions.filter((a) => a.type === "search").map((a) => a.key);
  assertEquals(searches.sort(), SEARCH_ACTIONS);
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

/** Strip comments so the sandbox guards below scan CODE, not prose. */
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
    assert(!/giphy\.com/.test(src), `${a.key}: contains a GIPHY host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: every action goes through the shared client", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(src.includes("new GiphyClient(ctx)"), `${a.key}: does not use the shared client`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|account|customer_?id)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth ------------------------------------------------------------------

Deno.test("index: the single auth method is a query-string API key with a body-based test", () => {
  const [auth] = app.auth;
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "query", name: "api_key" });
  assertEquals(typeof auth.sign, "function");
  assertEquals(typeof auth.test, "function");
  // GIPHY documents no account endpoint, so there is no identity to publish.
  assertEquals(auth.afterConnect, undefined);
});

// --- health ----------------------------------------------------------------

Deno.test("index: every health check has exactly one of check/unavailable and a title", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof (h as { unavailable?: { reason?: string } }).unavailable
      ?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * GIPHY publishes a real Statuspage feed, so this app declares a live `service`
 * check and no `unavailable` placeholder — and no `quota` check either, because
 * no rate-limit header exists to read.
 */
Deno.test("index: the health surface is one live service check", () => {
  assertEquals(app.healthChecks.map((h) => h.key), ["service"]);
  assertEquals(app.healthChecks[0].kind, "service");
  assertEquals(app.healthChecks[0].network?.allow, ["status.giphy.com"]);
  assertEquals(app.healthChecks[0].credential, "none");
  assertEquals(app.healthChecks[0].severity, undefined);
});

/** A check that widens egress must be unsigned — a status host never sees the key. */
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

// --- manifest and icon -----------------------------------------------------

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      displayName: string;
      categories: string[];
      network: { allow: string[] };
      appearance: { icon: { svg: string; alt?: string }; darkMode?: { icon: { svg: string } } };
    };
  };

  assertEquals(manifest.w6w.id, "io.w6w.giphy");
  assertEquals(manifest.w6w.displayName, "GIPHY");
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
  assert(manifest.w6w.network.allow.includes("api.giphy.com"));
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.giphy.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
  assertEquals(manifest.w6w.appearance.icon.alt, "GIPHY");
  // A dark variant may be declared (the pack's legibility tool writes one for a
  // one-colour mark); if it is, the file it names has to exist.
  const dark = manifest.w6w.appearance.darkMode?.icon.svg;
  if (dark) {
    const svg = await Deno.readTextFile(new URL(`../${dark.slice(2)}`, import.meta.url));
    assert(svg.includes("GIPHY"), dark);
  }
});

Deno.test("index: the icon is the vendor's mark, verbatim, inside assets/", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Copied byte-for-byte from simple-icons' GIPHY mark (the vendor's own brand
  // asset; giphy.com's apple-touch-icon 404s and its CDN asset paths 403).
  assertEquals(
    svg,
    '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
      "<title>GIPHY</title>" +
      '<path d="M2.666 0v24h18.668V8.666l-2.668 2.668v10H5.334V2.668H10L12.666 0z' +
      'm10.668 0v8h8V5.334h-2.668V2.668H16V0"/></svg>\n',
  );
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});

Deno.test("index: the client is the only module that knows the API origin", async () => {
  const client = await Deno.readTextFile(new URL("../lib/client.ts", import.meta.url));
  assertEquals(client.includes(`export const API_BASE = "${API_ROOT.slice(0, -3)}"`), true);
});
