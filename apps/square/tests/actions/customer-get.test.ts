import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-get.ts";

Deno.test("customer-get: GETs /v2/customers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { customer: { id: "c1" } } }]);
  await action.execute({ customerId: "c1" }, ctx);
  assertEquals(calls[0].url, "https://connect.squareup.com/v2/customers/c1");
});
