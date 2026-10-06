import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 36;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 3);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/** iClosed accepts no idempotency key, so a retried create writes twice. */
Deno.test("index: no creating action is marked idempotent", () => {
  for (
    const key of [
      "contact-create",
      "contact-note-create",
      "field-create",
      "deal-create",
      "call-create",
      "product-create",
      "transaction-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: no action carries credentials or the global fetch", async () => {
  for (const a of app.actions) {
    const src = await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url));
    assert(!/authorization/i.test(src), `${a.key}: mentions authorization`);
    assert(!/(^|[^.\w])fetch\(/.test(src), `${a.key}: global fetch`);
  }
});

Deno.test("index: the manifest allows exactly the API host", async () => {
  const pkg = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  );
  assertEquals(pkg.w6w.network.allow, ["public.api.iclosed.io"]);
});

Deno.test("index: the quota check is a declared absence at informational severity", () => {
  const quota = app.healthChecks.find((h) => h.key === "quota");
  assertEquals(quota?.severity, "informational");
  assert(quota?.unavailable?.reason);
});
