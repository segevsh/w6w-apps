import { denoReadTextFile } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

const ACTION_COUNT = 14;

test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
});

test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

test("index: every action declares a valid type, a description and an execute hook", () => {
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

test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * `webinar-series-subscribe` (documented silent-skip on re-subscribe) and `broadcast-create`
 * (documented same-date-returns-existing) are the two vendor-confirmed idempotent performs.
 * `broadcast-subscribe` and `subscription-unsubscribe` are the other two performs; the former
 * has no documented dedupe behavior so it stays non-idempotent, the latter reaches the same end
 * state on retry.
 */
test("index: idempotency matches the vendor's own documented retry behavior", () => {
  const byKey = Object.fromEntries(app.actions.map((a) => [a.key, a]));
  assertEquals(byKey["webinar-series-subscribe"].idempotent, true);
  assertEquals(byKey["broadcast-create"].idempotent, true);
  assertEquals(byKey["subscription-unsubscribe"].idempotent, true);
  assertEquals(byKey["broadcast-subscribe"].idempotent, false);
});

test("index: every param has a key and a label", () => {
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
  code(await denoReadTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/api-token/i.test(src), `${a.key}: sets the auth header itself`);
  }
});

test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

/** The API origin lives in `lib/client.ts` and nowhere else. */
test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/webinargeek\.com/.test(src), `${a.key}: contains a WebinarGeek host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

// --- auth --------------------------------------------------------------------

test("index: the credential field is not exposed as an action param", () => {
  const banned = /^(access_?token|refresh_?token|client_?secret|token|api_?key)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: credential field leaked into params`);
    }
  }
});

test("index: auth is apiKey with exactly one secret field", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "apiKey");
  assertEquals(method.fields?.length, 1);
  assertEquals(method.fields?.[0].type, "secret");
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

// --- health ------------------------------------------------------------------

test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

// --- manifest ------------------------------------------------------------------

test("index: the manifest allows exactly the one product host", async () => {
  const manifest = JSON.parse(
    await denoReadTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      categories: string[];
      network: { allow: string[] };
      appearance: { icon: { svg: string } };
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.webinargeek");
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
  assertEquals(manifest.w6w.network.allow, ["app.webinargeek.com"]);
  assert(!manifest.w6w.network.allow.includes("status.webinargeek.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

test("index: the icon is the vendor's own SVG mark, not invented", async () => {
  const svg = await denoReadTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim 2026-09-06 from webinargeek.com's own homepage <link rel="icon"> asset.
  assert(svg.includes("<svg"), "not a valid SVG");
  assert(svg.includes("#1E69FF"), "vendor markup changed — check the source is still verbatim");
});

test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
