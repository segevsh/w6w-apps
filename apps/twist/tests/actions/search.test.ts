import { assert, assertEquals } from "@std/assert";
import search from "../../actions/search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("search: GET /api/v3/search with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await search.execute({
    "workspaceId": 100,
    "query": "sample query",
    "limit": 102,
    "cursorMark": "sample cursorMark",
    "type": "all",
    "title": "sample title",
    "toUserId": 106,
    "toGroupId": 107,
    "conversationIds": "1, 2",
    "channelIds": "1, 2",
    "fromUserId": 110,
    "beforeTs": 111,
    "afterTs": 112,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/search");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(queryOf(calls[0].url), {
    "workspace_id": "100",
    "query": "sample query",
    "limit": "102",
    "cursor_mark": "sample cursorMark",
    "type": "all",
    "title": "sample title",
    "to_user_id": "106",
    "to_group_id": "107",
    "conversation_ids": "[1,2]",
    "channel_ids": "[1,2]",
    "from_user_id": "110",
    "before_ts": "111",
    "after_ts": "112",
  });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("search: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await search.execute({ "workspaceId": 100, "query": "sample query" }, ctx);

  assertEquals(queryOf(calls[0].url), { "workspace_id": "100", "query": "sample query" });
});

Deno.test("search: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await search.execute({
    "workspaceId": 100,
    "query": "sample query",
    "limit": 102,
    "cursorMark": "sample cursorMark",
    "type": "all",
    "title": "sample title",
    "toUserId": 106,
    "toGroupId": 107,
    "conversationIds": "1, 2",
    "channelIds": "1, 2",
    "fromUserId": 110,
    "beforeTs": 111,
    "afterTs": 112,
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("search: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await search.execute({ "workspaceId": 100, "query": "sample query" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
