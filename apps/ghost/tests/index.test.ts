import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exposes exactly the expected action keys, each unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(
    keys.sort(),
    [
      "create-member",
      "create-post",
      "delete-post",
      "get-post",
      "get-site-info",
      "list-members",
      "list-pages",
      "list-posts",
      "list-tags",
      "list-tiers",
      "update-post",
    ].sort(),
  );
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: declares the admin-api-key auth method", () => {
  assertEquals(app.auth?.map((a) => a.key), ["admin-api-key"]);
});

Deno.test("index: declares the service, quota and site health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["quota", "service", "site"]);
});

Deno.test("index: every action declares a type and a title", () => {
  for (const action of app.actions) {
    assert(["read", "search", "perform", "control"].includes(action.type));
    assert(action.title.length > 0);
  }
});
