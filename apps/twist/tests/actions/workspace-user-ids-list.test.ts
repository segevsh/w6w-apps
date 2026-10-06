import { assert, assertEquals } from "@std/assert";
import workspaceUserIdsList from "../../actions/workspace-user-ids-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("workspace-user-ids-list: GET /api/v4/workspace_users/get_ids with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  const out = await workspaceUserIdsList.execute({ "workspaceId": 100 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v4/workspace_users/get_ids");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(queryOf(calls[0].url), { "id": "100" });
  assertEquals(out, { "items": [{ "id": 1 }, { "id": 2 }] });
});

Deno.test("workspace-user-ids-list: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  await workspaceUserIdsList.execute({ "workspaceId": 100 }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("workspace-user-ids-list: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await workspaceUserIdsList.execute({ "workspaceId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
