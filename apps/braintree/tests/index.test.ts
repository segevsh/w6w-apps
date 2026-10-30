import { denoReadTextFile } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

test("index: exports 20 actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, 20);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

test("index: every action has a type, description, output, resource and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
    assert(a.resource, `${a.key}: no resource`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
  }
});

test("index: idempotency is stated on every perform and creates are not idempotent", () => {
  const byKey = new Map(app.actions.map((a) => [a.key, a]));
  for (const a of app.actions.filter((x) => x.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  for (const k of ["customer-create", "payment-method-vault", "client-token-create"]) {
    assertEquals(byKey.get(k)?.idempotent, false, k);
  }
  for (
    const k of [
      "transaction-charge",
      "transaction-authorize",
      "transaction-capture",
      "transaction-partial-capture",
      "transaction-void",
      "transaction-refund",
      "transaction-reverse",
      "customer-update",
      "customer-delete",
      "payment-method-delete",
    ]
  ) assertEquals(byKey.get(k)?.idempotent, true, k);
});

test("index: every action param key is unique and labelled", () => {
  for (const a of app.actions) {
    const keys = a.params!.map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${a.key}: duplicate param key`);
    for (const p of a.params!) assert(p.label, `${a.key}.${p.key}: no label`);
  }
});

test("index: no action source touches an Authorization header or the global fetch", async () => {
  for (const a of app.actions) {
    const src = await denoReadTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url));
    assert(
      !/["']authorization["']\s*:|\bbasic\b\s|\bbearer\b/i.test(src),
      `${a.key}: sets credentials`,
    );
    assert(!/\bfetch\(/.test(src.replace(/ctx\.fetch\(/g, "")), `${a.key}: global fetch`);
  }
});
