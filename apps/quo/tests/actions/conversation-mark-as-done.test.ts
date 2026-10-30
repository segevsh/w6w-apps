import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import conversationMarkAsDone from "../../actions/conversation-mark-as-done.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("conversation-mark-as-done: POSTs the mark-as-done path and returns the bare object (no data wrapper)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "CN1", name: null } }]);
  const out = await conversationMarkAsDone.execute({ conversationId: "CN1" }, ctx) as {
    id: string;
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/conversations/CN1/mark-as-done");
  assertEquals(out.id, "CN1");
  assertEquals("data" in (out as unknown as Record<string, unknown>), false);
});

test("conversation-mark-as-done: is an idempotent perform action", () => {
  assertEquals(conversationMarkAsDone.type, "perform");
  assertEquals(conversationMarkAsDone.idempotent, true);
});
