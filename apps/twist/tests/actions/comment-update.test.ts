import { assert, assertEquals } from "@std/assert";
import commentUpdate from "../../actions/comment-update.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("comment-update: POST /api/v3/comments/update with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await commentUpdate.execute({
    "commentId": 100,
    "content": "sample content",
    "directMentions": "1, 2",
    "directGroupMentions": "1, 2",
    "actions": { "a": true },
    "attachments": { "a": true },
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/comments/update");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), {
    "id": "100",
    "content": "sample content",
    "direct_mentions": "[1,2]",
    "direct_group_mentions": "[1,2]",
    "actions": '{"a":true}',
    "attachments": '{"a":true}',
  });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("comment-update: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await commentUpdate.execute({
    "commentId": 100,
    "content": "sample content",
    "directMentions": "1, 2",
    "directGroupMentions": "1, 2",
    "actions": { "a": true },
    "attachments": { "a": true },
  }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("comment-update: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await commentUpdate.execute({ "commentId": 100 }, ctx);

  assertEquals(formOf(calls[0].body), { "id": "100" });
});

Deno.test("comment-update: is declared idempotent", () => {
  assertEquals(commentUpdate.idempotent, true);
});

Deno.test("comment-update: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await commentUpdate.execute({
    "commentId": 100,
    "content": "sample content",
    "directMentions": "1, 2",
    "directGroupMentions": "1, 2",
    "actions": { "a": true },
    "attachments": { "a": true },
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("comment-update: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await commentUpdate.execute({ "commentId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
