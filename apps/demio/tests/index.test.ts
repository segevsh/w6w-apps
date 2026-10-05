import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports six actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, 6);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: action keys are unique kebab-case with descriptions and execute hooks", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), a.key);
    assert(a.description && a.description.length > 0, `${a.key}: description`);
    assertEquals(typeof a.execute, "function");
    for (const p of a.params ?? []) assert(p.key && p.label, `${a.key}: param key/label`);
  }
});

Deno.test("index: the one creating action is explicitly not idempotent", () => {
  assertEquals(app.actions.find((a) => a.key === "event-register")?.idempotent, false);
});

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

Deno.test("index: actions never touch credentials, global fetch, Deno.* or a hard-coded host", async () => {
  for (const a of app.actions) {
    const src = strip(await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url)));
    assert(!/credential|api-?secret|api-?key/i.test(src), `${a.key}: credential`);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: Deno.*`);
    assert(!/demio\.com/.test(src), `${a.key}: hard-coded host`);
  }
});

Deno.test("index: manifest egress allowlist is exactly my.demio.com", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["my.demio.com"]);
});
