import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares 53 actions with unique kebab-case keys and typed kinds", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 53);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const a of app.actions) {
    assertEquals(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), true, `${a.key} must be kebab-case`);
    assertEquals(["read", "search", "perform"].includes(a.type), true);
    assertEquals(typeof a.execute, "function");
  }
  for (const key of ["message-send", "contact-create", "contact-update", "webhook-create"]) {
    assertEquals(keys.includes(key), true, `${key} must be present`);
  }
});

Deno.test("index: every perform action states whether it is idempotent", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  // Sending, creating and exporting are not safe to retry; deletes and PUT/PATCH are.
  const byKey = new Map(app.actions.map((a) => [a.key, a]));
  assertEquals(byKey.get("message-send")!.idempotent, false);
  assertEquals(byKey.get("contact-create")!.idempotent, false);
  assertEquals(byKey.get("contact-delete")!.idempotent, true);
});

Deno.test("index: one auth method (api-key) and service + api + quota health checks", () => {
  assertEquals(app.auth?.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["api", "quota", "service"]);
});

Deno.test("index: no action sets credentials itself", async () => {
  for (const key of app.actions.map((a) => a.key)) {
    const src = await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url));
    assertEquals(/x-api-key|authorization/i.test(src), false, `${key} must not touch credentials`);
  }
});
