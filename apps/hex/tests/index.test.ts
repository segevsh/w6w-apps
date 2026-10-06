import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 15;

Deno.test("index: exports actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "api-token");
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: action keys are unique kebab-case with a description and an execute hook", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `not kebab-case: ${a.key}`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert((a.description ?? "").length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function");
    assert(Array.isArray(a.output), `${a.key}: no output`);
    for (const p of a.params ?? []) assert(p.key && p.label, `${a.key}/${p.key}: key or label`);
  }
});

/** Neither perform has an idempotency key; a retry would start a second run / 422. */
Deno.test("index: both perform actions declare idempotent: false", () => {
  const performs = app.actions.filter((a) => a.type === "perform");
  assertEquals(performs.map((a) => a.key).sort(), ["project-run", "run-cancel"]);
  for (const a of performs) assertEquals(a.idempotent, false, a.key);
});

/** Strip comments so the guards scan code, not prose. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

Deno.test("index: actions never touch credentials, global fetch, Deno.* or a host literal", async () => {
  for (const a of app.actions) {
    const src = code(await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url)));
    assert(!/credential|authorization|\bbearer\b|api[_-]?(key|token)/i.test(src), a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: Deno.*`);
    assert(!/https?:\/\/|hex\.tech/.test(src), `${a.key}: host literal`);
  }
});

Deno.test("index: the deprecated updateCache run parameter is never sent", async () => {
  const src = code(await Deno.readTextFile(new URL("../actions/project-run.ts", import.meta.url)));
  assert(!/updateCache/.test(src));
  assert(/updatePublishedResults/.test(src));
});

Deno.test("index: manifest allowlists only app.hex.tech", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["app.hex.tech"]);
});
