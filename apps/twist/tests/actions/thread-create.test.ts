import { assert, assertEquals } from "@std/assert";
import threadCreate from "../../actions/thread-create.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("thread-create: POST /api/v3/threads/add with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await threadCreate.execute({
    "channelId": 100,
    "title": "sample title",
    "content": "sample content",
    "recipients": "1, 2",
    "groups": "1, 2",
    "directMentions": "1, 2",
    "directGroupMentions": "1, 2",
    "actions": { "a": true },
    "attachments": { "a": true },
    "sendAsIntegration": true,
    "tempId": 110,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/threads/add");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), {
    "channel_id": "100",
    "title": "sample title",
    "content": "sample content",
    "recipients": "[1,2]",
    "groups": "[1,2]",
    "direct_mentions": "[1,2]",
    "direct_group_mentions": "[1,2]",
    "actions": '{"a":true}',
    "attachments": '{"a":true}',
    "send_as_integration": "true",
    "temp_id": "110",
  });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("thread-create: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await threadCreate.execute({
    "channelId": 100,
    "title": "sample title",
    "content": "sample content",
    "recipients": "1, 2",
    "groups": "1, 2",
    "directMentions": "1, 2",
    "directGroupMentions": "1, 2",
    "actions": { "a": true },
    "attachments": { "a": true },
    "sendAsIntegration": true,
    "tempId": 110,
  }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("thread-create: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await threadCreate.execute({
    "channelId": 100,
    "title": "sample title",
    "content": "sample content",
  }, ctx);

  assertEquals(formOf(calls[0].body), {
    "channel_id": "100",
    "title": "sample title",
    "content": "sample content",
  });
});

Deno.test("thread-create: is declared non-idempotent", () => {
  assertEquals(threadCreate.idempotent, false);
});

Deno.test("thread-create: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await threadCreate.execute({
    "channelId": 100,
    "title": "sample title",
    "content": "sample content",
    "recipients": "1, 2",
    "groups": "1, 2",
    "directMentions": "1, 2",
    "directGroupMentions": "1, 2",
    "actions": { "a": true },
    "attachments": { "a": true },
    "sendAsIntegration": true,
    "tempId": 110,
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("thread-create: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await threadCreate.execute({
      "channelId": 100,
      "title": "sample title",
      "content": "sample content",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
