import { assert, assertEquals } from "@std/assert";
import threadClose from "../../actions/thread-close.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("thread-close: POST /api/v3/comments/add with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await threadClose.execute(
    { "threadId": 100, "content": "sample content" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/comments/add");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), {
    "thread_id": "100",
    "content": "sample content",
    "thread_action": "close",
  });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("thread-close: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await threadClose.execute({ "threadId": 100, "content": "sample content" }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("thread-close: is declared non-idempotent", () => {
  assertEquals(threadClose.idempotent, false);
});

Deno.test("thread-close: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await threadClose.execute({ "threadId": 100, "content": "sample content" }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("thread-close: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await threadClose.execute({ "threadId": 100, "content": "sample content" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
