import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import conversationCancel from "../../actions/conversation-cancel.ts";
import { mockCtxWithConnection, pathOf } from "../_helpers.ts";

test("conversation-cancel: posts a messageIds array split from the comma-separated input", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ body: { success: true } }]);
  const result = await conversationCancel.execute(
    { cId: "c1", messageIds: "m1, m2 ,m3" },
    ctx,
  );

  assertEquals(
    pathOf(calls[0].url),
    `/api/v1/w/${ctx.connection?.display?.workspaceId}/assistant/conversations/c1/cancel`,
  );
  assertEquals(JSON.parse(calls[0].body!), { messageIds: ["m1", "m2", "m3"] });
  assertEquals(result, { success: true });
});

test("conversation-cancel: is declared idempotent", () => {
  assertEquals(conversationCancel.idempotent, true);
});
