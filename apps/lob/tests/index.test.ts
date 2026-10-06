import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 37;

Deno.test("index: exports actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "api-key");
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action declares type, description, params, output and execute", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assert(Array.isArray(a.params), `${a.key}: no params`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * A mailpiece create prints and posts a physical item and, on a live key, bills for it. The
 * runtime may retry an action marked idempotent, so none of the creates may claim it.
 */
Deno.test("index: no mailpiece or money-moving create is marked idempotent", () => {
  for (
    const key of [
      "postcard-create",
      "letter-create",
      "self-mailer-create",
      "check-create",
      "address-create",
      "bank-account-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: reads never carry credentials in their params", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!/^(authorization|apiKey|api_key)$/i.test(p.key), `${a.key}: credential-like param`);
    }
  }
});

Deno.test("index: the API key is the only secret field and is declared secret", () => {
  const auth = app.auth[0];
  assertEquals(auth.type, "basic");
  assertEquals(auth.fields?.map((f) => `${f.key}:${f.type}`), ["apiKey:secret"]);
});

Deno.test("index: the service check names its own host and the rate-limit check is informational", () => {
  const service = app.healthChecks.find((c) => c.key === "service")!;
  assertEquals(service.network?.allow, ["lob.statuspage.io"]);
  const rate = app.healthChecks.find((c) => c.key === "rate-limit")!;
  assertEquals(rate.severity, "informational");
  assert(rate.unavailable?.reason);
});
