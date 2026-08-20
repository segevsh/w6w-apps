import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares one auth method and the expected action/health-check counts", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "personal-api-key");
  assertEquals(app.actions.length, 8);
  assertEquals(app.healthChecks?.length, 1);
});

Deno.test("index: every action key is unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: every action has a title, type and execute hook", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(typeof action.type, "string");
    assertEquals(typeof action.execute, "function");
  }
});

Deno.test("index: capture-event is the only action that opts out of requiring auth", () => {
  const noAuth = app.actions.filter((a) => a.requiresAuth === false).map((a) => a.key);
  assertEquals(noAuth, ["capture-event"]);
});

Deno.test("index: health checks are keyed service", () => {
  const keys = app.healthChecks?.map((h) => h.key);
  assertEquals(keys, ["service"]);
});

Deno.test("index: no param is buried in a `group` the studio renders as JSON", () => {
  // `ParamsForm` routes `type: "group"` to the JSON editor, so a group's
  // children never render as fields — the defect that made SendGrid look like
  // it had no CC/BCC. Sections are layout-only and render their children as
  // real inputs; a `json` param is a deliberate JSON editor. Neither is a group.
  const buried: string[] = [];
  const walk = (actionKey: string, list: unknown) => {
    for (const entry of (list ?? []) as Array<Record<string, unknown>>) {
      if (entry?.type === "group") buried.push(`${actionKey}.${String(entry.key)}`);
      walk(actionKey, entry?.children);
    }
  };
  for (const a of app.actions) walk(a.key, a.params);
  assertEquals(buried, []);
});
