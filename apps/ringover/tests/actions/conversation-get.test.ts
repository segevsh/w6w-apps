import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/conversation-get.ts";
import { mockCtx } from "../_helpers.ts";

test("conversation-get: GETs /conversations/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { conversation_id: 12, type: "EXTERNAL" } }]);
  const out = await action.execute!({ conversationId: 12 }, ctx);
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/conversations/12");
  assertEquals(out, { conversation_id: 12, type: "EXTERNAL" });
});
