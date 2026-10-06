import { assert, assertEquals } from "@std/assert";
import commentCreate from "../../actions/comment-create.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("comment-create: POST /api/v3/comments/add with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await commentCreate.execute({
    "threadId": 100,
    "content": "sample content",
    "recipients": "1, 2",
    "groups": "1, 2",
    "directMentions": "1, 2",
    "directGroupMentions": "1, 2",
    "actions": { "a": true },
    "attachments": { "a": true },
    "markThreadPosition": true,
    "sendAsIntegration": true,
    "tempId": 110,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/comments/add");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), {
    "thread_id": "100",
    "content": "sample content",
    "recipients": "[1,2]",
    "groups": "[1,2]",
    "direct_mentions": "[1,2]",
    "direct_group_mentions": "[1,2]",
    "actions": '{"a":true}',
    "attachments": '{"a":true}',
    "mark_thread_position": "true",
    "send_as_integration": "true",
    "temp_id": "110",
  });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("comment-create: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await commentCreate.execute({
    "threadId": 100,
    "content": "sample content",
    "recipients": "1, 2",
    "groups": "1, 2",
    "directMentions": "1, 2",
    "directGroupMentions": "1, 2",
    "actions": { "a": true },
    "attachments": { "a": true },
    "markThreadPosition": true,
    "sendAsIntegration": true,
    "tempId": 110,
  }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("comment-create: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await commentCreate.execute({ "threadId": 100, "content": "sample content" }, ctx);

  assertEquals(formOf(calls[0].body), { "thread_id": "100", "content": "sample content" });
});

Deno.test("comment-create: is declared non-idempotent", () => {
  assertEquals(commentCreate.idempotent, false);
});

Deno.test("comment-create: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await commentCreate.execute({
    "threadId": 100,
    "content": "sample content",
    "recipients": "1, 2",
    "groups": "1, 2",
    "directMentions": "1, 2",
    "directGroupMentions": "1, 2",
    "actions": { "a": true },
    "attachments": { "a": true },
    "markThreadPosition": true,
    "sendAsIntegration": true,
    "tempId": 110,
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("comment-create: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await commentCreate.execute({ "threadId": 100, "content": "sample content" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
