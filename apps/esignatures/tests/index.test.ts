import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 24;

Deno.test("index: exports actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action has a valid type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/** The vendor accepts no idempotency key: a retried send/create would duplicate or double-bill. */
Deno.test("index: actions that create or send something are not marked idempotent", () => {
  const byKey = new Map(app.actions.map((a) => [a.key, a]));
  for (
    const key of [
      "contract-create",
      "contract-send-draft",
      "signer-add",
      "signer-resend",
      "template-create",
      "template-duplicate",
      "collaborator-add",
    ]
  ) {
    assertEquals(byKey.get(key)?.idempotent, false, key);
  }
});

Deno.test("index: the service health check is a declared absence with informational severity", () => {
  const service = app.healthChecks.find((h) => h.key === "service")!;
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason);
  assertEquals(service.check, undefined);
});

Deno.test("index: no action carries credentials or uses global fetch", async () => {
  for (const f of Deno.readDirSync(new URL("../actions/", import.meta.url))) {
    const src = await Deno.readTextFile(new URL(`../actions/${f.name}`, import.meta.url));
    assert(!/authorization/i.test(src), `${f.name}: mentions authorization`);
    assert(!/[^.\w]fetch\(/.test(src), `${f.name}: global fetch`);
    assert(!/token=/.test(src), `${f.name}: query-string token`);
  }
});
