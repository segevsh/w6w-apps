import { assert, assertEquals } from "@std/assert";
import commentList from "../../actions/comment-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("comment-list: GET /api/v3/comments/get with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  const out = await commentList.execute({
    "threadId": 100,
    "newerThanTs": 101,
    "olderThanTs": 102,
    "fromObjIndex": 103,
    "toObjIndex": 104,
    "limit": 105,
    "orderBy": "desc",
    "asIds": true,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/comments/get");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(queryOf(calls[0].url), {
    "thread_id": "100",
    "newer_than_ts": "101",
    "older_than_ts": "102",
    "from_obj_index": "103",
    "to_obj_index": "104",
    "limit": "105",
    "order_by": "desc",
    "as_ids": "true",
  });
  assertEquals(out, { "items": [{ "id": 1 }, { "id": 2 }] });
});

Deno.test("comment-list: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  await commentList.execute({ "threadId": 100 }, ctx);

  assertEquals(queryOf(calls[0].url), { "thread_id": "100" });
});

Deno.test("comment-list: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  await commentList.execute({
    "threadId": 100,
    "newerThanTs": 101,
    "olderThanTs": 102,
    "fromObjIndex": 103,
    "toObjIndex": 104,
    "limit": 105,
    "orderBy": "desc",
    "asIds": true,
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("comment-list: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await commentList.execute({ "threadId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
