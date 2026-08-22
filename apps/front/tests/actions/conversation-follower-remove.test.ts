import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-follower-remove.ts";

Deno.test("conversation-follower-remove: the DELETE carries the ids in its body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ conversationId: "cnv_1", teammateIds: "tea_1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assert(calls[0].body);
  assertEquals(JSON.parse(calls[0].body!), { teammate_ids: ["tea_1"] });
});

Deno.test("conversation-follower-remove: the 50-per-call cap applies here too", async () => {
  const { ctx } = mockCtx();
  const many = Array.from({ length: 51 }, (_, i) => `tea_${i}`).join(",");
  await assertRejects(
    async () => await action.execute!({ conversationId: "cnv_1", teammateIds: many }, ctx),
    Error,
    "50",
  );
});
