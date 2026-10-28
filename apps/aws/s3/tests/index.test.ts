import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares exactly one auth method, `aws-iam`", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "aws-iam");
});

Deno.test("index: declares 9 actions with unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 9);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const key of keys) {
    if (!/^[a-z]+(-[a-z]+)*$/.test(key)) throw new Error(`not kebab-case: ${key}`);
  }
  assertEquals(keys.sort(), [
    "bucket-create",
    "bucket-delete",
    "bucket-list",
    "object-copy",
    "object-delete",
    "object-get",
    "object-head",
    "object-list",
    "object-put",
  ]);
});

Deno.test("index: every action declares execute, params, and output", () => {
  for (const action of app.actions) {
    if (typeof action.execute !== "function") throw new Error(`${action.key}: missing execute`);
    if (!Array.isArray(action.output)) throw new Error(`${action.key}: missing output`);
  }
});

Deno.test("index: declares the `service` health check", () => {
  assertEquals(app.healthChecks?.length, 1);
  assertEquals(app.healthChecks?.[0].key, "service");
});
