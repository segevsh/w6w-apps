import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 33;

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

Deno.test("index: every action has a valid type, description, output and execute", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && a.description.length > 0, a.key);
    assertEquals(typeof a.execute, "function", a.key);
    assert(Array.isArray(a.output), a.key);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
});

/** Anchor takes no idempotency key: a retried create/publish/charge would do it twice. */
Deno.test("index: money- and client-visible actions are never marked idempotent", () => {
  for (
    const key of [
      "contact-create",
      "proposal-publish",
      "proposal-approve-on-behalf",
      "credit-add",
      "charges-submit",
      "proposal-draft-create-from-template",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: the service health check is a declared absence with informational severity", () => {
  const service = app.healthChecks.find((h) => h.key === "service")!;
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason);
});

Deno.test("index: no action source holds a credential or calls global fetch", async () => {
  for (const a of app.actions) {
    const src = await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url));
    assert(!/authorization|anchor-user-email/i.test(src.replace(/^\s*\/\*\*.*$/gm, "")), a.key);
    assert(!/\bfetch\(/.test(src.replace(/ctx\.fetch\(/g, "")), a.key);
  }
});
