import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import conversationMarkRead from "../../actions/conversation-mark-read.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

test("conversation-mark-read: POST /api/v3/conversations/mark_read with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await conversationMarkRead.execute({
    "conversationId": 100,
    "objIndex": 101,
    "messageId": 102,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/conversations/mark_read");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "id": "100", "obj_index": "101", "message_id": "102" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

test("conversation-mark-read: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await conversationMarkRead.execute(
    { "conversationId": 100, "objIndex": 101, "messageId": 102 },
    ctx,
  );

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

test("conversation-mark-read: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await conversationMarkRead.execute({ "conversationId": 100 }, ctx);

  assertEquals(formOf(calls[0].body), { "id": "100" });
});

test("conversation-mark-read: is declared idempotent", () => {
  assertEquals(conversationMarkRead.idempotent, true);
});

test("conversation-mark-read: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await conversationMarkRead.execute(
    { "conversationId": 100, "objIndex": 101, "messageId": 102 },
    ctx,
  );

  assert(!("authorization" in calls[0].headers));
});

test("conversation-mark-read: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await conversationMarkRead.execute({ "conversationId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
