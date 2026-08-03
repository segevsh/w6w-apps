import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares `oauth2` and `service-account` auth methods", () => {
  assertEquals(app.auth?.map((a) => a.key).sort(), ["oauth2", "service-account"]);
});

Deno.test("index: declares 12 actions with unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 12);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const key of keys) {
    if (!/^[a-z]+(-[a-z]+)*$/.test(key)) throw new Error(`not kebab-case: ${key}`);
  }
  assertEquals(keys.slice().sort(), [
    "form-add-item",
    "form-batch-update",
    "form-create",
    "form-delete-item",
    "form-get",
    "form-move-item",
    "form-set-publish-settings",
    "form-update-info",
    "form-update-settings",
    "list-forms",
    "response-get",
    "response-list",
  ]);
});

Deno.test("index: every action declares execute, params and output", () => {
  for (const action of app.actions) {
    if (typeof action.execute !== "function") throw new Error(`${action.key}: missing execute`);
    if (!Array.isArray(action.params)) throw new Error(`${action.key}: missing params`);
    if (!Array.isArray(action.output)) throw new Error(`${action.key}: missing output`);
  }
});

Deno.test("index: every `perform` action declares idempotent explicitly", () => {
  for (const action of app.actions) {
    if (action.type !== "perform") continue;
    if (typeof action.idempotent !== "boolean") {
      throw new Error(`${action.key}: perform action must declare idempotent`);
    }
  }
});

Deno.test("index: read/search actions are the non-mutating ones", () => {
  const byType: Record<string, string[]> = {};
  for (const a of app.actions) (byType[a.type] ??= []).push(a.key);
  assertEquals(byType.read?.sort(), ["form-get", "response-get", "response-list"]);
  assertEquals(byType.search, ["list-forms"]);
});

Deno.test("index: declares `service` and `quota` health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["quota", "service"]);
});
