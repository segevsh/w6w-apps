import { assert, assertEquals } from "@std/assert";
import commentMarkPosition from "../../actions/comment-mark-position.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("comment-mark-position: POST /api/v3/comments/mark_position with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await commentMarkPosition.execute(
    { "threadId": 100, "commentId": 101 },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/comments/mark_position");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "thread_id": "100", "comment_id": "101" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("comment-mark-position: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await commentMarkPosition.execute({ "threadId": 100, "commentId": 101 }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("comment-mark-position: is declared idempotent", () => {
  assertEquals(commentMarkPosition.idempotent, true);
});

Deno.test("comment-mark-position: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await commentMarkPosition.execute({ "threadId": 100, "commentId": 101 }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("comment-mark-position: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await commentMarkPosition.execute({ "threadId": 100, "commentId": 101 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
