import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 15;

Deno.test("index: exports actions, one oauth2 auth method and three health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].type, "oauth2");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), key);
});

Deno.test("index: every action has a valid type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", a.key);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action declares idempotency", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(p.key && p.label, `${a.key}: param missing key/label`);
    }
  }
});

function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

Deno.test("index: no action touches a credential, sets Authorization or calls global fetch", async () => {
  for (const a of app.actions) {
    const src = code(await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url)));
    assert(!/\bcredential\b/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization|bearer|access_?token|AppKey/i.test(src), `${a.key}: auth material`);
    assert(!/(^|[^.\w])fetch\(/.test(src), `${a.key}: calls global fetch`);
  }
});

Deno.test("index: the manifest allowlists only www.inoreader.com", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["www.inoreader.com"]);
  assertEquals(pkg.w6w.id, "io.w6w.inoreader");
});

Deno.test("index: the icon is the vendor's SVG, not an invention", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(svg.includes("<svg") && svg.includes("favicon"));
});
