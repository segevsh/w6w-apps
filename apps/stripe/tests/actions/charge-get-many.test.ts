import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/charge-get-many.ts";

Deno.test("charge-get-many: scopes to a customer when one is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({ customerId: "cus_1", limit: 3 }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("customer"), "cus_1");
  assertEquals(q.get("limit"), "3");
});
