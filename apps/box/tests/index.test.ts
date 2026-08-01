import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares exactly one auth method, `oauth2`", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "oauth2");
});

Deno.test("index: declares 10 actions with unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 10);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const key of keys) {
    if (!/^[a-z]+(-[a-z]+)*$/.test(key)) throw new Error(`not kebab-case: ${key}`);
  }
  assertEquals(keys.sort(), [
    "create-folder",
    "create-shared-link",
    "delete-file",
    "delete-folder",
    "download-file",
    "get-file",
    "get-folder",
    "list-folder-items",
    "search",
    "upload-file",
  ]);
});

Deno.test("index: every action declares execute and params", () => {
  for (const action of app.actions) {
    if (typeof action.execute !== "function") throw new Error(`${action.key}: missing execute`);
    if (!Array.isArray(action.params)) throw new Error(`${action.key}: missing params`);
  }
});

Deno.test("index: declares `service` and `quota` health checks", () => {
  const keys = app.healthChecks?.map((h) => h.key).sort();
  assertEquals(keys, ["quota", "service"]);
});
