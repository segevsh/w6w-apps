import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 29;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth?.length, 1);
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "ping", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action declares a valid type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency, and creates are not idempotent", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
  for (const key of ["job-create", "job-message-create", "contact-create", "contact-note-create"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
  for (const key of ["job-update-address", "contact-update"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

Deno.test("index: every param has a key and a label, and param keys are unique per action", () => {
  for (const a of app.actions) {
    const seen = new Set<string>();
    for (const p of a.params ?? []) {
      assert(p.key && p.label, `${a.key}: param without key/label`);
      assert(!seen.has(p.key), `${a.key}: duplicate param ${p.key}`);
      seen.add(p.key);
    }
  }
});

/** The two spellings of the start-index parameter are the app's central trap. */
Deno.test("index: every list action exposes startIndex, never a raw vendor spelling", () => {
  for (const a of app.actions) {
    const keys = (a.params ?? []).map((p) => p.key);
    assert(!keys.includes("recordStartIndex") && !keys.includes("pageStartIndex"), a.key);
    if (keys.includes("pageSize")) assert(keys.includes("startIndex"), `${a.key}: no startIndex`);
  }
});

Deno.test("index: no action carries a credential or Authorization header", async () => {
  const src = await Promise.all(
    app.actions.map((a) => Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url))),
  );
  for (const s of src) assert(!/authorization|apiKey|Bearer/i.test(s));
});
