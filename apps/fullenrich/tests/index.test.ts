import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const PKG = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));

Deno.test("index: ten actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, 10);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "api-key");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: action keys are unique, kebab-case and match the expected surface", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), key);
  assertEquals(keys, [
    "enrich-start",
    "enrich-get",
    "reverse-email-start",
    "reverse-email-get",
    "people-search",
    "company-search",
    "people-lookup",
    "company-lookup",
    "account-credits-get",
    "account-verify-key",
  ]);
});

Deno.test("index: every action has a description, output, resource and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && Array.isArray(a.output) && a.output.length > 0 && a.resource, a.key);
    assertEquals(typeof a.execute, "function", a.key);
    assertEquals(a.type === "perform", typeof a.idempotent === "boolean", a.key);
  }
  const starts = app.actions.filter((a) => a.key.endsWith("-start"));
  assertEquals(starts.length, 2);
  for (const a of starts) assertEquals(a.idempotent, false, a.key);
});

Deno.test("index: no action source touches a credential or global fetch", async () => {
  for (const key of app.actions.map((a) => a.key)) {
    const src = await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url));
    assertEquals(/authorization|\bapiKey\b|bearer/i.test(src), false, key);
    assertEquals(/(^|[^.\w])fetch\(/.test(src), false, key);
  }
});

Deno.test("index: network.allow lists exactly the API host", () => {
  assertEquals(PKG.w6w.network.allow, ["app.fullenrich.com"]);
});

Deno.test("index: the quota check is informational", () => {
  assertEquals(app.healthChecks.find((h) => h.key === "quota")?.severity, "informational");
  assertEquals(app.healthChecks.find((h) => h.key === "service")?.severity, "informational");
});
