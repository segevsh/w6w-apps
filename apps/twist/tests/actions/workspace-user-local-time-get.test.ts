import { assert, assertEquals } from "@std/assert";
import workspaceUserLocalTimeGet from "../../actions/workspace-user-local-time-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("workspace-user-local-time-get: GET /api/v4/workspace_users/get_local_time with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: '"2026-10-06 07:55:40"' }]);
  const out = await workspaceUserLocalTimeGet.execute(
    { "workspaceId": 100, "userId": 101 },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v4/workspace_users/get_local_time");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(queryOf(calls[0].url), { "id": "100", "user_id": "101" });
  assertEquals(out, { "result": "2026-10-06 07:55:40" });
});

Deno.test("workspace-user-local-time-get: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: '"2026-10-06 07:55:40"' }]);
  await workspaceUserLocalTimeGet.execute({ "workspaceId": 100, "userId": 101 }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("workspace-user-local-time-get: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await workspaceUserLocalTimeGet.execute({ "workspaceId": 100, "userId": 101 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
