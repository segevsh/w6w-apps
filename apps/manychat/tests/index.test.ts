import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("app: every action key is unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, `duplicate keys in ${keys}`);
});

Deno.test("app: every action declares a title, description and execute hook", () => {
  for (const action of app.actions) {
    assert(action.title, `${action.key} has no title`);
    assert(action.description, `${action.key} has no description`);
    assert(typeof action.execute === "function", `${action.key} has no execute`);
  }
});

Deno.test("app: every action's type is one of the four in the spec", () => {
  const valid = new Set(["read", "search", "perform", "control"]);
  for (const action of app.actions) {
    assert(valid.has(action.type), `${action.key} has invalid type ${action.type}`);
  }
});

Deno.test("app: every param has a label and every action declares output fields", () => {
  for (const action of app.actions) {
    assert(action.output, `${action.key} declares no output`);
    for (const param of action.params ?? []) {
      assert(param.label, `${action.key}.${param.key} has no label`);
    }
  }
});

Deno.test("app: declares the single bearer-token auth method", () => {
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "api-token");
  assertEquals(app.auth[0].type, "bearer");
});

Deno.test("app: the token field is a secret, and it is the only field", () => {
  const fields = app.auth[0].fields ?? [];
  assertEquals(fields.length, 1);
  assertEquals(fields[0].key, "token");
  assertEquals(fields[0].type, "secret");
});

Deno.test("app: no action takes the token, or any page identifier, as a param", () => {
  // The credential lives on the Connection and is stamped by `sign`. A page id
  // param would also be wrong: nothing in the API accepts one.
  for (const action of app.actions) {
    for (const param of action.params ?? []) {
      assert(
        !/token|secret|password|apikey|page_?id/i.test(param.key),
        `${action.key}.${param.key} looks like credential or page-selector material`,
      );
    }
  }
});

Deno.test("app: declares both a service and a quota health check", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["quota", "service"]);
});

Deno.test("app: every health check either probes or explains its absence", () => {
  for (const check of app.healthChecks ?? []) {
    const hasProbe = typeof check.check === "function";
    assert(
      hasProbe !== !!check.unavailable,
      `${check.key} must have exactly one of check or unavailable`,
    );
    if (check.unavailable) {
      assertEquals(
        check.severity,
        "informational",
        `${check.key} is unavailable and so reports unknown — it must be informational`,
      );
    }
  }
});

Deno.test("app: every perform action declares idempotent — it drives retry and dedupe", () => {
  for (const action of app.actions) {
    if (action.type !== "perform") continue;
    assertEquals(
      typeof action.idempotent,
      "boolean",
      `${action.key} must declare idempotent`,
    );
  }
});

Deno.test("app: no send action is idempotent — a retry would deliver a second message", () => {
  const sends = app.actions.filter((a) => a.key.startsWith("send-"));
  assertEquals(sends.length, 2, "expected send-flow and send-content");
  for (const action of sends) {
    assertEquals(action.idempotent, false, `${action.key} must not be retry-safe`);
  }
});

Deno.test("app: neither creator of a new object is marked idempotent", () => {
  for (const action of app.actions) {
    if (!action.key.startsWith("create-")) continue;
    assertEquals(
      action.idempotent,
      false,
      `${action.key} creates an object; a replay is not documented to de-duplicate`,
    );
  }
});

Deno.test("app: the deprecated getWidgets endpoint is not shipped", () => {
  // Manychat's own description reads "Use getGrowthTools instead".
  const keys = app.actions.map((a) => a.key);
  assert(!keys.includes("list-widgets"), "getWidgets is vendor-deprecated");
  assert(keys.includes("list-growth-tools"), "its replacement must be present");
});
