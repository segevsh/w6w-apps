import { assert, assertEquals } from "@std/assert";
import conversationMarkUnread from "../../actions/conversation-mark-unread.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("conversation-mark-unread: POST /api/v3/conversations/mark_unread with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await conversationMarkUnread.execute({
    "conversationId": 100,
    "objIndex": 101,
    "messageId": 102,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/conversations/mark_unread");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "id": "100", "obj_index": "101", "message_id": "102" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("conversation-mark-unread: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await conversationMarkUnread.execute(
    { "conversationId": 100, "objIndex": 101, "messageId": 102 },
    ctx,
  );

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("conversation-mark-unread: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await conversationMarkUnread.execute({ "conversationId": 100 }, ctx);

  assertEquals(formOf(calls[0].body), { "id": "100" });
});

Deno.test("conversation-mark-unread: is declared idempotent", () => {
  assertEquals(conversationMarkUnread.idempotent, true);
});

Deno.test("conversation-mark-unread: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await conversationMarkUnread.execute(
    { "conversationId": 100, "objIndex": 101, "messageId": 102 },
    ctx,
  );

  assert(!("authorization" in calls[0].headers));
});

Deno.test("conversation-mark-unread: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await conversationMarkUnread.execute({ "conversationId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
