import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import pkg from "../package.json" with { type: "json" };

const ACTION_COUNT = 30;

Deno.test("index: exports actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), key);
});

Deno.test("index: every action has a type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && a.description.length > 0, a.key);
    assert(Array.isArray(a.output) && a.output.length > 0, a.key);
    assertEquals(typeof a.execute, "function", a.key);
  }
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) assert(p.key && p.label, `${a.key}: ${JSON.stringify(p.key)}`);
  }
});

Deno.test("index: every perform declares idempotency; sends and imports are not retryable", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  // A retry would send a second email or add a second set of rows.
  for (
    const key of ["inbox-message-reply", "prospect-add", "prospect-add-to-campaign"]
  ) {
    const a = app.actions.find((a) => a.key === key);
    assertEquals(a?.idempotent, false, key);
  }
});

Deno.test("index: the manifest declares only the API host and a dark icon", () => {
  assertEquals(pkg.w6w.network.allow, ["api.woodpecker.co"]);
  assertEquals(pkg.w6w.id, "io.w6w.woodpecker");
  assert(pkg.w6w.appearance.darkMode.icon.svg.endsWith("icon.dark.svg"));
});

Deno.test("index: health checks are informational where nothing can be probed", () => {
  const quota = app.healthChecks.find((h) => h.key === "quota");
  assertEquals(quota?.severity, "informational");
  assertEquals(quota?.check, undefined);
});
