import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 20;

Deno.test("index: exports actions, auth and health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "api-key");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action has a valid type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency; creates are not idempotent", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
    if (a.key.endsWith("-create") || a.key.endsWith("-add")) assertEquals(a.idempotent, false);
  }
});

Deno.test("index: every list action offers limit, cursor and organizationId", () => {
  for (const a of app.actions.filter((a) => a.key.endsWith("-list"))) {
    const keys = (a.params ?? []).map((p) => p.key);
    for (const k of ["limit", "cursor", "organizationId"]) {
      if (a.key === "workorder-comment-list" && k === "organizationId") continue;
      assert(keys.includes(k), `${a.key}: missing ${k}`);
    }
  }
});

Deno.test("index: no action touches a credential or global fetch", async () => {
  for (const f of Deno.readDirSync(new URL("../actions/", import.meta.url))) {
    const src = await Deno.readTextFile(new URL(`../actions/${f.name}`, import.meta.url));
    assert(!/authorization/i.test(src), `${f.name}: mentions authorization`);
    assert(!/[^.\w]fetch\(/.test(src), `${f.name}: calls global fetch`);
  }
});
