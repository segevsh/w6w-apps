import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));

Deno.test("index: exposes 23 actions with unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 23);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(key), key);
});

Deno.test("index: one auth method, api-token", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-token"]);
});

Deno.test("index: health checks are the service probe and the declared request-rate absence", () => {
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "request-rate"]);
});

Deno.test("index: every action has a title, a description and typed params", () => {
  for (const action of app.actions) {
    assert(action.title && action.description, action.key);
    for (const param of action.params ?? []) assert(param.key && param.label, action.key);
  }
});

Deno.test("index: every perform action declares idempotency honestly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") assertEquals(typeof action.idempotent, "boolean", action.key);
  }
});

Deno.test("index: egress is exactly cloud.seatable.io (the status host is per-check)", () => {
  assertEquals(pkg.w6w.network.allow, ["cloud.seatable.io"]);
});

Deno.test("index: manifest identity", () => {
  assertEquals(pkg.w6w.id, "io.w6w.seatable");
  assertEquals(pkg.w6w.categories, ["databases", "spreadsheets", "productivity"]);
});

Deno.test("index: no action source carries a credential or global fetch", async () => {
  for await (const entry of Deno.readDir(new URL("../actions/", import.meta.url))) {
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    assertEquals(/authorization|[^.\w]fetch\(/i.test(src), false, entry.name);
  }
});
