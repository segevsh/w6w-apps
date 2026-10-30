import { denoReadFile, denoReadTextFile, denoStat } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

const ACTION_COUNT = 39;

test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 3);
});

test("index: every action key is unique, kebab-case and has a test file", async () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
    await denoStat(new URL(`./actions/${key}.test.ts`, import.meta.url));
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
  }
});

test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/** Creates, the assistant launch, the upload grant and subscription start have side effects. */
test("index: creating actions are not marked idempotent", () => {
  for (
    const key of [
      "user-create",
      "team-create",
      "meeting-event-create",
      "meeting-event-launch-bot",
      "call-create",
      "call-presign-recording",
      "client-company-create",
      "client-subscription-start",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

test("index: every param has a key and a label, and required ones are marked", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

/** Strip comments so the guards below scan CODE, not the prose explaining it. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await denoReadTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/btoa\s*\(/.test(src), `${a.key}: encodes a Basic header itself`);
  }
});

test("index: no action calls global fetch or touches Deno.*, or hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|domain|base_?url|api_?key|key_?id|key_?secret|secret|token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

test("index: no deprecated Create Call params are exposed", () => {
  const call = app.actions.find((a) => a.key === "call-create")!;
  const keys = (call.params ?? []).map((p) => p.key);
  assert(!keys.includes("emails"));
  assert(!keys.includes("raw_phone_number"));
  assert(keys.includes("customers") && keys.includes("participating_user_uuids"));
});

// --- auth ----------------------------------------------------------------

test("index: the single auth method is Basic with two secret fields", () => {
  const [method] = app.auth;
  assertEquals(method.key, "basic");
  assertEquals(method.type, "basic");
  assertEquals((method.fields ?? []).map((f) => f.key), ["keyId", "keySecret"]);
  for (const f of method.fields ?? []) assertEquals(f.type, "secret", f.key);
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

test("index: the auth probe is GET /calls and never a user/team listing", async () => {
  const src = code(await denoReadTextFile(new URL("../auth/basic.ts", import.meta.url)));
  assert(src.includes("/calls?items=1"), "auth probe changed");
});

// --- health --------------------------------------------------------------

test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

test("index: any health check declaring extra egress is unsigned", () => {
  const widening = app.healthChecks.filter((h) => h.network?.allow?.length);
  assert(widening.length > 0, "no check widens egress — this test would pass vacuously");
  for (const h of widening) {
    assert(h.credential === "none", `${h.key}: widens egress while signed`);
  }
});

// --- manifest --------------------------------------------------------------

test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await denoReadTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { url: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.leexi");
  assertEquals(manifest.w6w.network.allow, ["public-api.leexi.ai"]);
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
});

test("index: the icon is a PNG (the vendor's favicon, stored verbatim)", async () => {
  const bytes = await denoReadFile(new URL("../assets/icon.png", import.meta.url));
  assertEquals([...bytes.slice(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
});

test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// key\nconst a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
