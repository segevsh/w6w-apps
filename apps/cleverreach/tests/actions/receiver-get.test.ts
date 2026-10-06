import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/receiver-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("receiver-get: looks a receiver up by email, encoding it", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9, email: "a+b@c.co" } }]);
  const out = await action.execute({ receiver: "a+b@c.co", groupId: "5" }, ctx) as {
    item: { id: number };
  };
  assertEquals(calls[0].url, "https://rest.cleverreach.com/v3/receivers/a%2Bb%40c.co?group_id=5");
  assertEquals(out.item.id, 9);
});

Deno.test("receiver-get: requires a receiver", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`receiver` is required");
  assertEquals(calls.length, 0);
});
