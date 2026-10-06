import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares oauth2 (production) and oauth2-sandbox", () => {
  assertEquals(app.auth?.map((a) => a.key), ["oauth2", "oauth2-sandbox"]);
});

Deno.test("index: declares 20 actions with unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 20);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const key of keys) {
    if (!/^[a-z]+(-[a-z]+)*$/.test(key)) throw new Error(`not kebab-case: ${key}`);
  }
  assertEquals(keys.sort(), [
    "company-list",
    "company-user-list",
    "file-get",
    "folder-get",
    "folder-list",
    "me-get",
    "observation-create",
    "observation-get",
    "observation-list",
    "project-get",
    "project-list",
    "project-user-list",
    "punch-item-create",
    "punch-item-get",
    "punch-item-list",
    "rfi-create",
    "rfi-get",
    "rfi-list",
    "submittal-get",
    "submittal-list",
  ]);
});

Deno.test("index: every action declares execute and params; performs declare idempotent", () => {
  for (const action of app.actions) {
    if (typeof action.execute !== "function") throw new Error(`${action.key}: missing execute`);
    if (!Array.isArray(action.params)) throw new Error(`${action.key}: missing params`);
    if (action.type === "perform" && action.idempotent === undefined) {
      throw new Error(`${action.key}: perform without idempotent`);
    }
  }
});

Deno.test("index: declares service, api and quota health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["api", "quota", "service"]);
});
