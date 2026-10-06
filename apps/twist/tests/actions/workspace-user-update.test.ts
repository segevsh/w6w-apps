import { assert, assertEquals } from "@std/assert";
import workspaceUserUpdate from "../../actions/workspace-user-update.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workspace-user-update: POST /api/v4/workspace_users/update with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await workspaceUserUpdate.execute({
    "workspaceId": 100,
    "userType": "USER",
    "email": "sample email",
    "userId": 103,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v4/workspace_users/update");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), {
    "id": "100",
    "user_type": "USER",
    "email": "sample email",
    "user_id": "103",
  });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("workspace-user-update: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceUserUpdate.execute({
    "workspaceId": 100,
    "userType": "USER",
    "email": "sample email",
    "userId": 103,
  }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("workspace-user-update: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceUserUpdate.execute({ "workspaceId": 100, "userType": "USER" }, ctx);

  assertEquals(formOf(calls[0].body), { "id": "100", "user_type": "USER" });
});

Deno.test("workspace-user-update: is declared idempotent", () => {
  assertEquals(workspaceUserUpdate.idempotent, true);
});

Deno.test("workspace-user-update: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceUserUpdate.execute({
    "workspaceId": 100,
    "userType": "USER",
    "email": "sample email",
    "userId": 103,
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("workspace-user-update: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await workspaceUserUpdate.execute({ "workspaceId": 100, "userType": "USER" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
