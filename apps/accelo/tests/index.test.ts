import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));

Deno.test("index: exposes 34 actions with unique keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 34);
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: every action is a read or perform with a resource and title", () => {
  for (const a of app.actions) {
    assert(a.type === "read" || a.type === "perform", a.key);
    assert(a.resource && a.title, a.key);
  }
});

Deno.test("index: writes are perform, reads are read, and creates are not idempotent", () => {
  for (const a of app.actions) {
    const write = /-(create|update)$/.test(a.key);
    assertEquals(a.type, write ? "perform" : "read", a.key);
    if (a.key.endsWith("-create")) assertEquals(a.idempotent, false, a.key);
  }
});

Deno.test("index: one auth method, a client-credentials service application", () => {
  assertEquals(app.auth.map((a) => a.key), ["client-credentials"]);
  assertEquals(app.auth[0].type, "custom");
});

Deno.test("index: declares service, deployment and quota health checks, all with informational or default severity", () => {
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "deployment", "quota"]);
});

Deno.test("manifest: egress is the per-deployment wildcard only", () => {
  assertEquals(pkg.w6w.network.allow, ["*.api.accelo.com"]);
  assertEquals(pkg.w6w.id, "io.w6w.accelo");
});

Deno.test("manifest: no action puts a credential on the wire itself", async () => {
  for await (const f of Deno.readDir(new URL("../actions", import.meta.url))) {
    const src = await Deno.readTextFile(new URL(`../actions/${f.name}`, import.meta.url));
    assert(!/authorization|bearer/i.test(src), f.name);
  }
});
