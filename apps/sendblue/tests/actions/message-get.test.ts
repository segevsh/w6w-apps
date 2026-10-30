import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import messageGet from "../../actions/message-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("message-get: GETs /api/v2/messages/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { message_handle: "m1" } } }]);
  const out = await messageGet.execute({ messageId: "m1" }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/v2/messages/m1");
  assertEquals((out.data as Record<string, unknown>).message_handle, "m1");
});

test("message-get: URL-encodes the message id", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await messageGet.execute({ messageId: "has/slash" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/messages/has%2Fslash");
});
