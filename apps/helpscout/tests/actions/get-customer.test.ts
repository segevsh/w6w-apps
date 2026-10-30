import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-customer.ts";

test("get-customer: GETs /customers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 500, firstName: "Vernon" } }]);
  const out = await action.execute({ customerId: 500 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/customers/500");
  assertEquals(out, { id: 500, firstName: "Vernon" });
});
