import { assertEquals, assertExists } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 14 actions, both auth methods, and both health checks", () => {
  assertEquals(app.actions.length, 14);
  assertEquals(app.auth?.map((a) => a.key), ["api-token", "oauth2"]);
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: every action key is unique kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) {
    assertEquals(/^[a-z][a-z0-9-]*$/.test(key), true, `"${key}" is not kebab-case`);
  }
});

Deno.test("index: every action declares execute and a valid type", () => {
  for (const action of app.actions) {
    assertExists(action.execute, `${action.key} is missing execute`);
    assertEquals(["read", "search", "perform", "control"].includes(action.type), true);
  }
});

Deno.test("index: perform actions declare `idempotent` explicitly", () => {
  for (const action of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof action.idempotent, "boolean", `${action.key} must declare idempotent`);
  }
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
