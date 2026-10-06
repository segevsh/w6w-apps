import { assert, assertEquals } from "@std/assert";
import reactionGet from "../../actions/reaction-get.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("reaction-get: POST /api/v3/reactions/get with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await reactionGet.execute(
    { "threadId": 100, "commentId": 101, "messageId": 102 },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/reactions/get");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), {
    "thread_id": "100",
    "comment_id": "101",
    "message_id": "102",
  });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("reaction-get: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await reactionGet.execute({ "threadId": 100, "commentId": 101, "messageId": 102 }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("reaction-get: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await reactionGet.execute({}, ctx);

  assertEquals(formOf(calls[0].body), {});
});

Deno.test("reaction-get: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await reactionGet.execute({ "threadId": 100, "commentId": 101, "messageId": 102 }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("reaction-get: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await reactionGet.execute({}, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
