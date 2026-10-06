import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 28;

Deno.test("index: exports actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "personal-access-token");
  assertEquals(app.healthChecks.map((h) => h.key).sort(), ["api", "quota", "service"]);
});

Deno.test("index: every action key is unique and kebab-case, with a description and execute", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `not kebab-case: ${a.key}`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function");
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency; reads do not", () => {
  for (const a of app.actions) {
    if (a.type === "perform") {
      assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent unset`);
    } else {
      assertEquals(a.idempotent, undefined, `${a.key}: read with idempotent`);
    }
  }
});

Deno.test("index: every action is covered by a test file that imports it", async () => {
  const sources: string[] = [];
  for await (const f of Deno.readDir(new URL("./actions/", import.meta.url))) {
    sources.push(await Deno.readTextFile(new URL(`./actions/${f.name}`, import.meta.url)));
  }
  const all = sources.join("\n");
  for (const a of app.actions) {
    assert(all.includes(`actions/${a.key}.ts`), `no test imports ${a.key}`);
  }
});

Deno.test("index: health checks never ship a credential and the quota check declares itself unavailable", () => {
  const quota = app.healthChecks.find((h) => h.key === "quota")!;
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason);
  for (const h of app.healthChecks.filter((h) => h.key !== "quota")) {
    assertEquals(h.credential, "none", h.key);
  }
});
