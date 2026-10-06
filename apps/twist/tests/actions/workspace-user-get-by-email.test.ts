import { assert, assertEquals } from "@std/assert";
import workspaceUserGetByEmail from "../../actions/workspace-user-get-by-email.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("workspace-user-get-by-email: GET /api/v4/workspace_users/get_by_email with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await workspaceUserGetByEmail.execute(
    { "workspaceId": 100, "email": "sample email" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v4/workspace_users/get_by_email");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(queryOf(calls[0].url), { "id": "100", "email": "sample email" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("workspace-user-get-by-email: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceUserGetByEmail.execute({ "workspaceId": 100, "email": "sample email" }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("workspace-user-get-by-email: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await workspaceUserGetByEmail.execute({ "workspaceId": 100, "email": "sample email" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
