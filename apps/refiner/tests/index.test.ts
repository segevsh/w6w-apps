import { denoReadDirSync, denoReadTextFileSync } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

const pkg = JSON.parse(denoReadTextFileSync(new URL("../package.json", import.meta.url)));

test("index: exposes 19 uniquely-keyed kebab-case actions", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 19);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z]+(-[a-z]+)*$/.test(k), k);
});

test("index: perform actions state their idempotency, reads do not", () => {
  for (const a of app.actions) {
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
    else assertEquals(a.idempotent, undefined, a.key);
  }
});

test("index: one bearer auth method, three health checks", () => {
  assertEquals(app.auth?.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["api", "quota", "service"]);
});

test("index: package.json declares only api.refiner.io and a valid identity", () => {
  assertEquals(pkg.w6w.network.allow, ["api.refiner.io"]);
  assert(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(pkg.w6w.id));
  assert(pkg.w6w.categories.length >= 1 && pkg.w6w.categories.length <= 3);
});

test("index: no action or auth file reads a credential or calls global fetch", () => {
  for (const dir of ["actions", "lib", "health"]) {
    for (const f of denoReadDirSync(new URL(`../${dir}/`, import.meta.url))) {
      const src = denoReadTextFileSync(new URL(`../${dir}/${f.name}`, import.meta.url));
      assert(!/\bauthorization\b/i.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")), f.name);
      assert(!/(^|[^.\w])fetch\(/.test(src), `${f.name} calls global fetch`);
    }
  }
});
