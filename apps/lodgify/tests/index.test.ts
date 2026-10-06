import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 30 actions, one auth method and four health checks", () => {
  assertEquals(app.actions.length, 30);
  assertEquals(app.auth?.length, 1);
  assertEquals(app.healthChecks?.length, 4);
});

Deno.test("index: action keys are unique kebab-case; every action is fully declared", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), a.key);
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.title && a.description, `${a.key}: title/description`);
    assertEquals(typeof a.execute, "function");
    assert(Array.isArray(a.params) && Array.isArray(a.output), `${a.key}: params/output`);
    if (a.type === "perform") {
      assertEquals(typeof a.idempotent, "boolean", `${a.key}: perform must declare idempotent`);
    }
    for (const p of a.params ?? []) {
      assert(p.key && p.label && p.type, `${a.key}/${p.key}`);
      if (p.type === "select") assert(Array.isArray(p.options), `${a.key}/${p.key}`);
      if (p.required) assertEquals(p.default, undefined, `${a.key}/${p.key}: required + default`);
    }
  }
});

function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

Deno.test("index: no action touches a credential, a host, global fetch or Deno.*", async () => {
  for (const a of app.actions) {
    const src = code(await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url)));
    assert(!/credential|apikey|x-api|authorization|bearer/i.test(src), `${a.key}: credential`);
    assert(!/lodgify\.com|https?:\/\//.test(src), `${a.key}: host/URL literal`);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: Deno.*`);
  }
});

Deno.test("index: connection identity is never an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|token|access_?token|secret)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) assert(!banned.test(p.key), `${a.key}/${p.key}`);
  }
});

Deno.test("index: auth is a secret apiKey field and every health key avoids the derived prefix", () => {
  const [method] = app.auth ?? [];
  assertEquals(method.key, "api-key");
  for (const f of method.fields ?? []) assertEquals(f.type, "secret");
  for (const c of app.healthChecks ?? []) assert(!c.key.startsWith("auth:"), c.key);
});

Deno.test("index: manifest allows only api.lodgify.com and points at the real icon", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; categories: string[] } };
  assertEquals(manifest.w6w.id, "io.w6w.lodgify");
  assertEquals(manifest.w6w.network.allow, ["api.lodgify.com"]);
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(svg.includes("data:image/png;base64,iVBOR") && svg.includes('width="180"'));
});
