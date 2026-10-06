import { assert, assertEquals } from "@std/assert";
import messageCreate from "../../actions/message-create.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("message-create: POST /api/v3/conversation_messages/add with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await messageCreate.execute({
    "conversationId": 100,
    "content": "sample content",
    "attachments": { "a": true },
    "actions": { "a": true },
    "directMentions": "1, 2",
    "directGroupMentions": "1, 2",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/conversation_messages/add");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), {
    "conversation_id": "100",
    "content": "sample content",
    "attachments": '{"a":true}',
    "actions": '{"a":true}',
    "direct_mentions": "[1,2]",
    "direct_group_mentions": "[1,2]",
  });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("message-create: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await messageCreate.execute({
    "conversationId": 100,
    "content": "sample content",
    "attachments": { "a": true },
    "actions": { "a": true },
    "directMentions": "1, 2",
    "directGroupMentions": "1, 2",
  }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("message-create: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await messageCreate.execute({ "conversationId": 100, "content": "sample content" }, ctx);

  assertEquals(formOf(calls[0].body), { "conversation_id": "100", "content": "sample content" });
});

Deno.test("message-create: is declared non-idempotent", () => {
  assertEquals(messageCreate.idempotent, false);
});

Deno.test("message-create: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await messageCreate.execute({
    "conversationId": 100,
    "content": "sample content",
    "attachments": { "a": true },
    "actions": { "a": true },
    "directMentions": "1, 2",
    "directGroupMentions": "1, 2",
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("message-create: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await messageCreate.execute({ "conversationId": 100, "content": "sample content" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
