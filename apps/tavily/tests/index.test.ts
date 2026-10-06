import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 7 actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, 7);
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: action keys are unique kebab-case with type, description, execute and output", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), a.key);
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && a.description.length > 0, a.key);
    assertEquals(typeof a.execute, "function", a.key);
    assert(Array.isArray(a.output), a.key);
  }
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) assert(p.key && p.label, `${a.key}/${p.key}`);
  }
});

Deno.test("index: the only perform action is research-start, and it is not idempotent", () => {
  const performs = app.actions.filter((a) => a.type === "perform");
  assertEquals(performs.map((a) => a.key), ["research-start"]);
  assertEquals(performs[0].idempotent, false);
});

Deno.test("index: no action carries credentials or uses global fetch", async () => {
  for await (const e of Deno.readDir(new URL("../actions", import.meta.url))) {
    const src = await Deno.readTextFile(new URL(`../actions/${e.name}`, import.meta.url));
    assert(!/authorization/i.test(src), `${e.name}: Authorization header in an action`);
    assert(!/(^|[^.\w])fetch\(/.test(src), `${e.name}: global fetch`);
  }
});

Deno.test("index: manifest allows only api.tavily.com", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["api.tavily.com"]);
});
