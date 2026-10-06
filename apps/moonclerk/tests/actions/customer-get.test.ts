import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/customer-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("customer-get: GET /customers/:id and unwraps customer", async () => {
  const { ctx, calls } = mockCtx([{ body: { customer: { id: 523425, name: "Ryan" } } }]);
  const out = await action.execute!({ customerId: 523425 }, ctx);
  assertEquals(calls[0].url, "https://api.moonclerk.com/customers/523425");
  assertEquals(out, { customer: { id: 523425, name: "Ryan" } });
});

Deno.test("customer-get: a body without a customer object is an error", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  await assertRejects(
    async () => await action.execute!({ customerId: 1 }, ctx),
    Error,
    'no "customer"',
  );
});
