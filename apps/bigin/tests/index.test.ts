import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import { ACCOUNTS_HOSTS, API_HOSTS, DEFAULT_API_DOMAIN, REGIONS } from "../lib/regions.ts";

/** 4 modules x (list, get, create, update, delete) + search + 2 user actions. */
const ACTION_COUNT = 23;

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    displayName: string;
    network: { allow: string[] };
    appearance: { icon: { url?: string; svg?: string; alt: string } };
  };
};

Deno.test("index: exports 23 actions, the oauth2 method and two health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "oauth2");
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: every module has the full CRUD set, and the two users actions exist", () => {
  const keys = app.actions.map((a) => a.key);
  for (const mod of ["contact", "company", "pipeline", "task"]) {
    for (const op of ["list", "get", "create", "update", "delete"]) {
      assert(keys.includes(`${mod}-${op}`), `missing ${mod}-${op}`);
    }
  }
  assert(keys.includes("search-records"));
  assert(keys.includes("user-list"));
  assert(keys.includes("user-get"));
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a type, a description, output and an execute hook", () => {
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

Deno.test("index: creates are not idempotent; updates and deletes are", () => {
  const idempotent = (key: string) => app.actions.find((a) => a.key === key)?.idempotent;
  for (const mod of ["contact", "company", "pipeline", "task"]) {
    assertEquals(idempotent(`${mod}-create`), false, `${mod}-create`);
    assertEquals(idempotent(`${mod}-update`), true, `${mod}-update`);
    assertEquals(idempotent(`${mod}-delete`), true, `${mod}-delete`);
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
 * Without this a doc comment explaining *why* an action never touches the
 * credential trips the assertion, while a reviewer's natural fix — deleting the
 * explanation — would leave a real violation just as invisible.
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
    assert(!/\bzoho-oauthtoken\b/i.test(src), `${a.key}: builds the oauth header itself`);
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
 * Every API host lives in `lib/regions.ts` / `lib/client.ts` and nowhere else.
 * An action that hard-coded a `www.zohoapis.<tld>` host — or accepted one as a
 * param — could be pointed somewhere the manifest never allowlisted.
 */
function stripDocProse(src: string): string {
  return src.replace(
    /\b(?:hint|description|placeholder|label|title|subtitle):\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)(?:\s*\+\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`))*/g,
    "",
  );
}

Deno.test("index: no action hard-codes a host or an absolute URL", async () => {
  for (const a of app.actions) {
    const src = stripDocProse(await actionSource(a.key));
    assert(
      !/zoho\.com|zoho\.eu|zoho\.in|zohocloud|zohoapis/.test(src),
      `${a.key}: contains a Zoho host literal`,
    );
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: stripDocProse actually strips, so the guard above means something", () => {
  const src = 'hint: "See https://example.com/docs.",\nconst host = "https://www.zohoapis.com";';
  const stripped = stripDocProse(src);
  assert(!stripped.includes("example.com"), "doc-prose URL survived stripping");
  assert(stripped.includes("www.zohoapis.com"), "a real code literal was stripped too");
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|access_?token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- regions / manifest ---------------------------------------------------

Deno.test("regions: all eight documented data centres, both host halves", () => {
  assertEquals(API_HOSTS, [
    "www.zohoapis.com",
    "www.zohoapis.com.au",
    "www.zohoapis.eu",
    "www.zohoapis.in",
    "www.zohoapis.com.cn",
    "www.zohoapis.jp",
    "www.zohoapis.sa",
    "www.zohoapis.ca",
  ]);
  assertEquals(ACCOUNTS_HOSTS, [
    "accounts.zoho.com",
    "accounts.zoho.com.au",
    "accounts.zoho.eu",
    "accounts.zoho.in",
    "accounts.zoho.com.cn",
    "accounts.zoho.jp",
    "accounts.zoho.sa",
    "accounts.zohocloud.ca",
  ]);
  assertEquals(DEFAULT_API_DOMAIN, "https://www.zohoapis.com");
});

Deno.test("regions: Canada's accounts host is accounts.zohocloud.ca, never accounts.zoho.ca", () => {
  const ca = REGIONS.find((r) => r.key === "ca")!;
  assertEquals(ca.apiHost, "www.zohoapis.ca");
  assertEquals(ca.accountsHost, "accounts.zohocloud.ca");
  assert(
    !ACCOUNTS_HOSTS.includes("accounts.zoho.ca"),
    "the pattern-suggested Canadian host does not exist",
  );
});

Deno.test("index: the manifest allows every regional API host and the US accounts host it calls", () => {
  assertEquals(manifest.w6w.id, "io.w6w.bigin");
  assertEquals(manifest.w6w.displayName, "Bigin by Zoho CRM");
  for (const host of API_HOSTS) {
    assert(manifest.w6w.network.allow.includes(host), `missing ${host}`);
  }
  assert(
    manifest.w6w.network.allow.includes("accounts.zoho.com"),
    "the US OAuth host this app actually calls must be declared",
  );
  // The other seven accounts hosts are never called: authorization starts at
  // accounts.zoho.com and Zoho's own redirect handles the user's home DC, while
  // token exchange/refresh always target the US token endpoint.
  for (const host of ACCOUNTS_HOSTS.filter((h) => h !== "accounts.zoho.com")) {
    assert(!manifest.w6w.network.allow.includes(host), `should not list ${host}`);
  }
  assertEquals(manifest.w6w.network.allow.length, API_HOSTS.length + 1);
});

// --- auth / health --------------------------------------------------------

Deno.test("index: the oauth2 method has both test and sign hooks", () => {
  const method = app.auth[0];
  assertEquals(method.type, "oauth2");
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

Deno.test("index: the quota check is informational, so it can never fail a verdict", () => {
  const quota = app.healthChecks.find((h) => h.key === "quota")!;
  assertEquals(quota.severity, "informational");
  assertEquals(quota.kind, "quota");
  assertEquals(typeof quota.check, "function");
});

/** A check that widens egress must be unsigned — a status host never sees the token. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  const widening = app.healthChecks.filter((h) => h.network?.allow?.length || h.feed);
  assert(widening.length > 0, "no check widens egress — this test would pass vacuously");
  for (const h of widening) {
    assert(
      h.credential === "none" || h.credential === "context" || h.credential === undefined,
      `${h.key}: widens egress while signed`,
    );
  }
});

// --- icon -----------------------------------------------------------------

Deno.test("index: the icon is the vendor's own favicon, shipped verbatim", async () => {
  const ref = manifest.w6w.appearance.icon;
  assertEquals(ref.url, "./assets/icon.ico");
  assertEquals(ref.svg, undefined);
  assert(ref.alt.length > 0, "missing alt text");
  const bytes = await Deno.readFile(new URL("../assets/icon.ico", import.meta.url));
  // The live vendor asset is 3,115 bytes (oweb.zohowebstatic.com, 2026-09-22).
  assertEquals(bytes.length, 3115);
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
