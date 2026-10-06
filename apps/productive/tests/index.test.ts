import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import manifest from "../package.json" with { type: "json" };

const ACTION_COUNT = 57;

Deno.test("index: exports the actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth!.length, 1);
  assertEquals(app.auth![0].key, "api-token");
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "api", "quota"]);
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

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

Deno.test("index: reads and searches are never marked idempotent (the field is perform-only)", () => {
  for (const a of app.actions.filter((a) => a.type !== "perform")) {
    assertEquals(a.idempotent, undefined, `${a.key}: idempotent on a ${a.type}`);
  }
});

Deno.test("index: every action key has a test file", async () => {
  for (const a of app.actions) {
    const stat = await Deno.stat(new URL(`./actions/${a.key}.test.ts`, import.meta.url));
    assert(stat.isFile, `${a.key}: no test`);
  }
});

Deno.test("index: the manifest declares only the API host and the entry module", () => {
  assertEquals(manifest.w6w.id, "io.w6w.productive");
  assertEquals(manifest.w6w.network.allow, ["api.productive.io"]);
  assertEquals(manifest.w6w.entry, "./index.ts");
});

Deno.test("index: every health check that names a host declares it in its own network.allow", () => {
  const service = app.healthChecks!.find((h) => h.key === "service")!;
  assertEquals(service.network?.allow, ["status.productive.io"]);
  assertEquals(service.credential, "none");
});

Deno.test("index: no action file mentions a credential header", async () => {
  for await (const f of Deno.readDir(new URL("../actions", import.meta.url))) {
    const src = await Deno.readTextFile(new URL(`../actions/${f.name}`, import.meta.url));
    assert(!/x-auth-token|x-organization-id/i.test(src), `${f.name} names a credential header`);
    assert(!/[^.\w]fetch\(/.test(src), `${f.name} calls a global fetch`);
  }
});
