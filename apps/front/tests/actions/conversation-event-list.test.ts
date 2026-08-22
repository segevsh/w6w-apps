import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-event-list.ts";

Deno.test("conversation-event-list: reads the conversation's own event feed", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { _results: [{ id: "evt_1", type: "assign" }] },
  }]);
  assertEquals(await action.execute!({ conversationId: "cnv_1" }, ctx), [{
    id: "evt_1",
    type: "assign",
  }]);
  assertEquals(new URL(calls[0].url).pathname, "/conversations/cnv_1/events");
});

Deno.test("conversation-event-list: a missing conversation id is refused", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "conversationId");
});
