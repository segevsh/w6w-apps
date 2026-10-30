import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import messageRetry from "../../actions/message-retry.ts";
import { mockCtx, pathOf, wrapped } from "../_helpers.ts";

test("message-retry: POST .../retry with messageId and stream:false, unwraps data", async () => {
  const { ctx, calls } = mockCtx([{ body: wrapped({ id: "msg_new" }) }]);
  const out = await messageRetry.execute(
    { agentId: "a1", conversationId: "c1", messageId: "msg_old" },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/conversations/c1/retry");
  assertEquals(JSON.parse(calls[0].body!), { messageId: "msg_old", stream: false });
  assertEquals(out.id, "msg_new");
});
