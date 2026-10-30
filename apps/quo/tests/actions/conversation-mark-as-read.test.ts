import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import conversationMarkAsRead from "../../actions/conversation-mark-as-read.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("conversation-mark-as-read: POSTs the mark-as-read path and returns the bare object", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "CN1" } }]);
  const out = await conversationMarkAsRead.execute({ conversationId: "CN1" }, ctx) as {
    id: string;
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/conversations/CN1/mark-as-read");
  assertEquals(out.id, "CN1");
});

test("conversation-mark-as-read: is an idempotent perform action", () => {
  assertEquals(conversationMarkAsRead.type, "perform");
  assertEquals(conversationMarkAsRead.idempotent, true);
});
