import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import manifest from "../package.json" with { type: "json" };

const ACTION_COUNT = 31;

Deno.test("index: exports actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "api-key");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action has a type, description, execute hook and output", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert((a.description ?? "").length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency; reads and searches never do", () => {
  for (const a of app.actions) {
    if (a.type === "perform") {
      assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
    } else assertEquals(a.idempotent, undefined, `${a.key}: idempotent on a ${a.type}`);
  }
});

Deno.test("index: every action key has a test file", async () => {
  for (const a of app.actions) {
    const stat = await Deno.stat(new URL(`./actions/${a.key}.test.ts`, import.meta.url));
    assert(stat.isFile, `${a.key}: no test`);
  }
});

Deno.test("index: network.allow is exactly the one API host", () => {
  assertEquals(manifest.w6w.network.allow, ["axonaut.com"]);
});

Deno.test("index: no action carries a credential or calls the global fetch", async () => {
  for (const a of app.actions) {
    const src = await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url));
    assert(!/userapikey/i.test(src), `${a.key}: credential header in an action`);
    assert(!/(^|[^.\w])fetch\(/.test(src), `${a.key}: global fetch`);
  }
});

Deno.test("index: the credential-echoing /me endpoint is never called", async () => {
  for (const f of ["auth/api-key.ts", "health/api.ts", "lib/client.ts"]) {
    const src = await Deno.readTextFile(new URL(`../${f}`, import.meta.url));
    assert(!/["'`]\/?(api\/v2)?\/me["'`]/.test(src), `${f}: calls /me`);
  }
  for (const a of app.actions) assert(a.key !== "me", "a /me action would echo the key");
});
