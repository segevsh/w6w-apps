import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import conversationUnarchive from "../../actions/conversation-unarchive.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

test("conversation-unarchive: POST /api/v3/conversations/unarchive with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await conversationUnarchive.execute({ "conversationId": 100 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/conversations/unarchive");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "id": "100" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

test("conversation-unarchive: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await conversationUnarchive.execute({ "conversationId": 100 }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

test("conversation-unarchive: is declared idempotent", () => {
  assertEquals(conversationUnarchive.idempotent, true);
});

test("conversation-unarchive: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await conversationUnarchive.execute({ "conversationId": 100 }, ctx);

  assert(!("authorization" in calls[0].headers));
});

test("conversation-unarchive: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await conversationUnarchive.execute({ "conversationId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
