import { assert, assertEquals } from "@std/assert";
import attachmentRemove from "../../actions/attachment-remove.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("attachment-remove: POST /api/v3/attachments/remove with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await attachmentRemove.execute({
    "attachmentId": 100,
    "threadId": 101,
    "commentId": 102,
    "messageId": 103,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/attachments/remove");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), {
    "attachment_id": "100",
    "thread_id": "101",
    "comment_id": "102",
    "message_id": "103",
  });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("attachment-remove: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await attachmentRemove.execute({
    "attachmentId": 100,
    "threadId": 101,
    "commentId": 102,
    "messageId": 103,
  }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("attachment-remove: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await attachmentRemove.execute({ "attachmentId": 100 }, ctx);

  assertEquals(formOf(calls[0].body), { "attachment_id": "100" });
});

Deno.test("attachment-remove: is declared idempotent", () => {
  assertEquals(attachmentRemove.idempotent, true);
});

Deno.test("attachment-remove: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await attachmentRemove.execute({
    "attachmentId": 100,
    "threadId": 101,
    "commentId": 102,
    "messageId": 103,
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("attachment-remove: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await attachmentRemove.execute({ "attachmentId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
