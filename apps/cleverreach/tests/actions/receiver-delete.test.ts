import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/receiver-delete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("receiver-delete: DELETEs by id with the group query", async () => {
  const { ctx, calls } = mockCtx([{ body: true }]);
  const out = await action.execute({ receiver: "11", groupId: "5" }, ctx) as { result: unknown };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://rest.cleverreach.com/v3/receivers/11?group_id=5");
  assertEquals(out.result, true);
});

Deno.test("receiver-delete: omits the query without a group and requires a receiver", async () => {
  const { ctx, calls } = mockCtx([{ body: true }]);
  await action.execute({ receiver: "11" }, ctx);
  assertEquals(calls[0].url, "https://rest.cleverreach.com/v3/receivers/11");
  await assertRejects(async () => await action.execute({}, ctx), Error, "`receiver` is required");
});
