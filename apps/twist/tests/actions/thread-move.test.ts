import { assert, assertEquals } from "@std/assert";
import threadMove from "../../actions/thread-move.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("thread-move: POST /api/v3/threads/move_to_channel with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await threadMove.execute({ "threadId": 100, "toChannelId": 101 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/threads/move_to_channel");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "id": "100", "to_channel": "101" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("thread-move: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await threadMove.execute({ "threadId": 100, "toChannelId": 101 }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("thread-move: is declared idempotent", () => {
  assertEquals(threadMove.idempotent, true);
});

Deno.test("thread-move: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await threadMove.execute({ "threadId": 100, "toChannelId": 101 }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("thread-move: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await threadMove.execute({ "threadId": 100, "toChannelId": 101 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
