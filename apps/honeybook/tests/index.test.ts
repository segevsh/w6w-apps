import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 38 actions, one oauth2 auth and the service health check", () => {
  assertEquals(app.actions.length, 38);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].type, "oauth2");
  assertEquals(app.healthChecks.map((h) => h.key), ["service"]);
});

Deno.test("index: action keys are unique kebab-case, with a valid type", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.title && a.description, `${a.key}: missing title/description`);
  }
});

Deno.test("index: perform actions state idempotency; reads do not", () => {
  for (const a of app.actions) {
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
    else assertEquals(a.idempotent, undefined, a.key);
  }
});

Deno.test("index: every param has a unique key within its action", () => {
  for (const a of app.actions) {
    const keys = (a.params ?? []).map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, a.key);
  }
});

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url));
    assert(!/authorization|bearer|fetch\(/i.test(src.replace(/ctx\.fetch/g, "")), a.key);
  }
});

Deno.test("index: package.json allows only the API host", async () => {
  const pkg = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  );
  assertEquals(pkg.w6w.network.allow, ["api.honeybook.com"]);
});
