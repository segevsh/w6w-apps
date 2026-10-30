import { denoReadTextFile } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

const pkg = JSON.parse(await denoReadTextFile(new URL("../package.json", import.meta.url)));

test("index: 27 actions with unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 27);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(k), k);
});

test("index: perform actions declare idempotency, reads and searches do not mutate", () => {
  for (const a of app.actions) {
    if (a.type === "perform") assert(typeof a.idempotent === "boolean", `${a.key} idempotent`);
  }
});

test("index: one auth method, service-user, of type basic", () => {
  assertEquals(app.auth.map((a) => [a.key, a.type]), [["service-user", "basic"]]);
});

test("index: declares service and quota health checks", () => {
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

test("index: network.allow is exactly api.hibob.com (status host stays per-check)", () => {
  assertEquals(pkg.w6w.network.allow, ["api.hibob.com"]);
  assertEquals(pkg.w6w.id, "io.w6w.hibob");
});
