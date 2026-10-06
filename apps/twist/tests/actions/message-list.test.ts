import { assert, assertEquals } from "@std/assert";
import messageList from "../../actions/message-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("message-list: GET /api/v3/conversation_messages/get with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  const out = await messageList.execute({
    "conversationId": 100,
    "limit": 101,
    "fromObjIndex": 102,
    "toObjIndex": 103,
    "orderBy": "desc",
    "asIds": true,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/conversation_messages/get");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(queryOf(calls[0].url), {
    "conversation_id": "100",
    "limit": "101",
    "from_obj_index": "102",
    "to_obj_index": "103",
    "order_by": "desc",
    "as_ids": "true",
  });
  assertEquals(out, { "items": [{ "id": 1 }, { "id": 2 }] });
});

Deno.test("message-list: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  await messageList.execute({ "conversationId": 100 }, ctx);

  assertEquals(queryOf(calls[0].url), { "conversation_id": "100" });
});

Deno.test("message-list: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  await messageList.execute({
    "conversationId": 100,
    "limit": 101,
    "fromObjIndex": 102,
    "toObjIndex": 103,
    "orderBy": "desc",
    "asIds": true,
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("message-list: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await messageList.execute({ "conversationId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
