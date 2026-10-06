import { assert, assertEquals } from "@std/assert";
import workspaceUserGet from "../../actions/workspace-user-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("workspace-user-get: GET /api/v4/workspace_users/getone with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await workspaceUserGet.execute({ "workspaceId": 100, "userId": 101 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v4/workspace_users/getone");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(queryOf(calls[0].url), { "id": "100", "user_id": "101" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("workspace-user-get: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceUserGet.execute({ "workspaceId": 100, "userId": 101 }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("workspace-user-get: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await workspaceUserGet.execute({ "workspaceId": 100, "userId": 101 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
