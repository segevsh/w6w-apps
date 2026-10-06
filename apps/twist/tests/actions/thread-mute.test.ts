import { assert, assertEquals } from "@std/assert";
import threadMute from "../../actions/thread-mute.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("thread-mute: POST /api/v3/threads/mute with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await threadMute.execute({ "threadId": 100, "minutes": 101 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/threads/mute");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "id": "100", "minutes": "101" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("thread-mute: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await threadMute.execute({ "threadId": 100, "minutes": 101 }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("thread-mute: is declared idempotent", () => {
  assertEquals(threadMute.idempotent, true);
});

Deno.test("thread-mute: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await threadMute.execute({ "threadId": 100, "minutes": 101 }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("thread-mute: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await threadMute.execute({ "threadId": 100, "minutes": 101 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
