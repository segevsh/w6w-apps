import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-get.ts";

Deno.test("customer-get: GETs /customers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cus_1" } }]);
  assertEquals(await action.execute({ customerId: "cus_1" }, ctx), { id: "cus_1" });
  assertEquals(calls[0].url, "https://api.stripe.com/v1/customers/cus_1");
  assertEquals(calls[0].method, "GET");
});
