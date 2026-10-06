import { assert, assertEquals } from "@std/assert";
import workspaceUserRemove from "../../actions/workspace-user-remove.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workspace-user-remove: POST /api/v4/workspace_users/remove with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await workspaceUserRemove.execute({
    "workspaceId": 100,
    "email": "sample email",
    "userId": 102,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v4/workspace_users/remove");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "id": "100", "email": "sample email", "user_id": "102" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("workspace-user-remove: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceUserRemove.execute(
    { "workspaceId": 100, "email": "sample email", "userId": 102 },
    ctx,
  );

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("workspace-user-remove: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceUserRemove.execute({ "workspaceId": 100, "email": "sample email" }, ctx);

  assertEquals(formOf(calls[0].body), { "id": "100", "email": "sample email" });
});

Deno.test("workspace-user-remove: is declared idempotent", () => {
  assertEquals(workspaceUserRemove.idempotent, true);
});

Deno.test("workspace-user-remove: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceUserRemove.execute(
    { "workspaceId": 100, "email": "sample email", "userId": 102 },
    ctx,
  );

  assert(!("authorization" in calls[0].headers));
});

Deno.test("workspace-user-remove: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await workspaceUserRemove.execute({ "workspaceId": 100, "email": "sample email" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
