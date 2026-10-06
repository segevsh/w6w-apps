import { assert, assertEquals } from "@std/assert";
import reactionAdd from "../../actions/reaction-add.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("reaction-add: POST /api/v3/reactions/add with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await reactionAdd.execute({
    "reaction": "sample reaction",
    "threadId": 101,
    "commentId": 102,
    "messageId": 103,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/reactions/add");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), {
    "reaction": "sample reaction",
    "thread_id": "101",
    "comment_id": "102",
    "message_id": "103",
  });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("reaction-add: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await reactionAdd.execute({
    "reaction": "sample reaction",
    "threadId": 101,
    "commentId": 102,
    "messageId": 103,
  }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("reaction-add: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await reactionAdd.execute({ "reaction": "sample reaction" }, ctx);

  assertEquals(formOf(calls[0].body), { "reaction": "sample reaction" });
});

Deno.test("reaction-add: is declared idempotent", () => {
  assertEquals(reactionAdd.idempotent, true);
});

Deno.test("reaction-add: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await reactionAdd.execute({
    "reaction": "sample reaction",
    "threadId": 101,
    "commentId": 102,
    "messageId": 103,
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("reaction-add: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await reactionAdd.execute({ "reaction": "sample reaction" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
