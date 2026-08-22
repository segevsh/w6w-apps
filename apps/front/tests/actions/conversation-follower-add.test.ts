import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-follower-add.ts";

Deno.test("conversation-follower-add: POSTs the teammate ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ conversationId: "cnv_1", teammateIds: "tea_1,alt:email:a@b.test" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/conversations/cnv_1/followers");
  assertEquals(JSON.parse(calls[0].body!), { teammate_ids: ["tea_1", "alt:email:a@b.test"] });
});

/** Front caps this at 50; failing here beats reading back its validation tree. */
Deno.test("conversation-follower-add: more than 50 followers is refused locally", async () => {
  const { ctx, calls } = mockCtx();
  const many = Array.from({ length: 51 }, (_, i) => `tea_${i}`).join(",");
  await assertRejects(
    async () => await action.execute!({ conversationId: "cnv_1", teammateIds: many }, ctx),
    Error,
    "50",
  );
  assertEquals(calls.length, 0);
});
