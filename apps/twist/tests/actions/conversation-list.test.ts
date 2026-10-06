import { assert, assertEquals } from "@std/assert";
import conversationList from "../../actions/conversation-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversation-list: GET /api/v3/conversations/get with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  const out = await conversationList.execute({
    "workspaceId": 100,
    "limit": 101,
    "newerThanTs": 102,
    "olderThanTs": 103,
    "beforeId": 104,
    "afterId": 105,
    "orderBy": "desc",
    "archived": true,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/conversations/get");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(queryOf(calls[0].url), {
    "workspace_id": "100",
    "limit": "101",
    "newer_than_ts": "102",
    "older_than_ts": "103",
    "before_id": "104",
    "after_id": "105",
    "order_by": "desc",
    "archived": "true",
  });
  assertEquals(out, { "items": [{ "id": 1 }, { "id": 2 }] });
});

Deno.test("conversation-list: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  await conversationList.execute({ "workspaceId": 100 }, ctx);

  assertEquals(queryOf(calls[0].url), { "workspace_id": "100" });
});

Deno.test("conversation-list: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  await conversationList.execute({
    "workspaceId": 100,
    "limit": 101,
    "newerThanTs": 102,
    "olderThanTs": 103,
    "beforeId": 104,
    "afterId": 105,
    "orderBy": "desc",
    "archived": true,
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("conversation-list: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await conversationList.execute({ "workspaceId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
