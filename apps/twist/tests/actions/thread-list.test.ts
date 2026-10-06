import { assert, assertEquals } from "@std/assert";
import threadList from "../../actions/thread-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("thread-list: GET /api/v3/threads/get with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  const out = await threadList.execute({
    "channelId": 100,
    "asIds": true,
    "filterBy": "everyone",
    "limit": 103,
    "newerThanTs": 104,
    "olderThanTs": 105,
    "beforeId": 106,
    "afterId": 107,
    "workspaceId": 108,
    "isPinned": true,
    "isStarred": true,
    "orderBy": "desc",
    "excludeThreadIds": "1, 2",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/threads/get");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(queryOf(calls[0].url), {
    "channel_id": "100",
    "as_ids": "true",
    "filter_by": "everyone",
    "limit": "103",
    "newer_than_ts": "104",
    "older_than_ts": "105",
    "before_id": "106",
    "after_id": "107",
    "workspace_id": "108",
    "is_pinned": "true",
    "is_starred": "true",
    "order_by": "desc",
    "exclude_thread_ids": "[1,2]",
  });
  assertEquals(out, { "items": [{ "id": 1 }, { "id": 2 }] });
});

Deno.test("thread-list: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  await threadList.execute({ "channelId": 100 }, ctx);

  assertEquals(queryOf(calls[0].url), { "channel_id": "100" });
});

Deno.test("thread-list: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  await threadList.execute({
    "channelId": 100,
    "asIds": true,
    "filterBy": "everyone",
    "limit": 103,
    "newerThanTs": 104,
    "olderThanTs": 105,
    "beforeId": 106,
    "afterId": 107,
    "workspaceId": 108,
    "isPinned": true,
    "isStarred": true,
    "orderBy": "desc",
    "excludeThreadIds": "1, 2",
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("thread-list: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await threadList.execute({ "channelId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
