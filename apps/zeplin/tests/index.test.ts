import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const PKG = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));

const KEYS = [
  "create-project-color",
  "create-screen-comment",
  "create-screen-note",
  "delete-screen-note",
  "get-current-user",
  "get-latest-screen-version",
  "get-project",
  "get-project-component",
  "get-project-design-tokens",
  "get-screen",
  "get-styleguide",
  "list-organization-projects",
  "list-organizations",
  "list-project-colors",
  "list-project-components",
  "list-project-members",
  "list-project-text-styles",
  "list-projects",
  "list-screen-notes",
  "list-screen-sections",
  "list-screen-versions",
  "list-screens",
  "list-styleguide-colors",
  "list-styleguide-components",
  "list-styleguides",
  "update-project",
  "update-screen",
  "update-screen-note",
];

Deno.test("index: one personal-access-token auth method and three health checks", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "personal-access-token");
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: action keys are unique and match the expected surface", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals([...keys].sort(), [...KEYS].sort());
});

Deno.test("index: every action has a title, a valid type and an execute hook", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(["read", "search", "perform"].includes(action.type), true);
    assertEquals(typeof action.execute, "function");
    assertEquals(action.type === "perform", typeof action.idempotent === "boolean");
  }
});

Deno.test("index: every action key has a test file", async () => {
  for (const key of KEYS) {
    await Deno.stat(new URL(`./actions/${key}.test.ts`, import.meta.url));
  }
});

Deno.test("index: no action source touches a credential or global fetch", async () => {
  for (const key of KEYS) {
    const src = await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url));
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "");
    assertEquals(/api_?key|authorization|bearer/i.test(code), false, key);
    assertEquals(/(^|[^.\w])fetch\(/.test(code), false, key);
  }
});

Deno.test("index: network.allow lists exactly the hosts the app calls", () => {
  assertEquals([...PKG.w6w.network.allow].sort(), ["api.zeplin.dev"]);
});

Deno.test("index: no health check widens egress; service is informational and hookless", () => {
  const byKey = Object.fromEntries(app.healthChecks!.map((h) => [h.key, h]));
  for (const h of app.healthChecks!) assertEquals(h.network, undefined);
  assertEquals(byKey.service.severity, "informational");
  assertEquals(byKey.service.check, undefined);
  assert(byKey.api.check && byKey.quota.check);
});

Deno.test("index: reads are type read, writes are perform, the icon file exists", async () => {
  const writes = app.actions.filter((a) => a.type === "perform").map((a) => a.key).sort();
  assertEquals(writes, [
    "create-project-color",
    "create-screen-comment",
    "create-screen-note",
    "delete-screen-note",
    "update-project",
    "update-screen",
    "update-screen-note",
  ]);
  await Deno.stat(new URL("../assets/icon.png", import.meta.url));
});
