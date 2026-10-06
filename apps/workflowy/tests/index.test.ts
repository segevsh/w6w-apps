import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 12 actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, 12);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: action keys are unique kebab-case with type, description, execute, output", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `not kebab-case: ${a.key}`);
    assert(["read", "search", "perform"].includes(a.type));
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function");
    assert(Array.isArray(a.output), `${a.key}: no output`);
    for (const p of a.params ?? []) assert(p.key && p.label, `${a.key}: param missing key/label`);
  }
});

Deno.test("index: every perform action states idempotency; creates are not idempotent", () => {
  for (const a of app.actions.filter((x) => x.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent unstated`);
  }
  for (const key of ["node-create", "node-mirror-create", "node-delete"]) {
    assertEquals(app.actions.find((a) => a.key === key)!.idempotent, false);
  }
});

Deno.test("index: no action source touches the credential or global fetch", async () => {
  for (const a of app.actions) {
    const src = await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url));
    assert(
      !/authorization|apiKey|credential/i.test(src.replace(/^\s*(\/\/|\*|\/\*).*$/gm, "")),
      a.key,
    );
    assert(!/(^|[^.\w])fetch\(/.test(src), `${a.key}: global fetch`);
  }
});

Deno.test("index: both health checks declare informational severity where unavailable", () => {
  const rl = app.healthChecks.find((h) => h.key === "rate-limit")!;
  assertEquals(rl.severity, "informational");
  assert(rl.unavailable?.reason);
});
