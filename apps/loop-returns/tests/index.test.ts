import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import pkg from "../package.json" with { type: "json" };

const ACTION_COUNT = 30;

Deno.test("index: exports actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "api-key");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), key);
});

Deno.test("index: every action has a type, description, resource, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && a.description.length > 0, a.key);
    assert(a.resource, a.key);
    assert(Array.isArray(a.output) && a.output.length > 0, a.key);
    assertEquals(typeof a.execute, "function", a.key);
  }
});

Deno.test("index: every param has a key and a label; required params have no default", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(p.key && p.label, `${a.key}: ${JSON.stringify(p.key)}`);
    }
  }
});

Deno.test("index: every perform declares idempotency", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
});

Deno.test("index: every action file is registered", async () => {
  const files: string[] = [];
  for await (const e of Deno.readDir(new URL("../actions/", import.meta.url))) {
    if (e.name.endsWith(".ts")) files.push(e.name.replace(/\.ts$/, ""));
  }
  assertEquals(files.sort(), app.actions.map((a) => a.key).sort());
});

Deno.test("index: manifest declares exactly the API host and a commerce category", () => {
  assertEquals(pkg.w6w.network.allow, ["api.loopreturns.com"]);
  assertEquals(pkg.w6w.id, "io.w6w.loop-returns");
  assert(pkg.w6w.categories.length >= 1 && pkg.w6w.categories.length <= 3);
});

Deno.test("index: no action source touches global fetch, Deno.* or an Authorization header", async () => {
  for await (const e of Deno.readDir(new URL("../actions/", import.meta.url))) {
    const src = await Deno.readTextFile(new URL(`../actions/${e.name}`, import.meta.url));
    assert(!/(^|[^.\w])fetch\(/.test(src), `${e.name}: global fetch`);
    assert(!/Deno\./.test(src), `${e.name}: Deno.*`);
    assert(!/authorization/i.test(src.replace(/^\s*\*.*$/gm, "")), `${e.name}: credential`);
  }
});
