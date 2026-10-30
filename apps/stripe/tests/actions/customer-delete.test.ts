import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-delete.ts";

test("customer-delete: DELETEs /customers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cus_1", deleted: true } }]);
  await action.execute({ customerId: "cus_1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.stripe.com/v1/customers/cus_1");
});
