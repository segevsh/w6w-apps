import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: every action has a unique kebab-case key, a resource, and an execute hook", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const action of app.actions) {
    assertEquals(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(action.key), true, `${action.key} kebab-case`);
    assertEquals(typeof action.resource, "string", `${action.key} resource`);
    assertEquals(typeof action.execute, "function", `${action.key} execute`);
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean", `${action.key} must declare idempotent`);
    }
  }
});

Deno.test("index: declares the 45 documented-and-verified actions", () => {
  assertEquals(app.actions.length, 45);
  for (
    const key of [
      "contacts-search",
      "companies-search",
      "contacts-research",
      "contacts-research-poll",
      "companies-research",
      "companies-research-poll",
      "credits-get",
    ]
  ) {
    assertEquals(app.actions.some((a) => a.key === key), true, key);
  }
});

Deno.test("index: one auth method, api-key, sent in the Token header", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");
  assertEquals(app.auth?.[0].apiKey, { in: "header", name: "Token" });
});

Deno.test("index: declares service + quota health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["quota", "service"]);
});
