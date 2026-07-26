import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-update.ts";

Deno.test("customer-update: POSTs only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ customerId: "cus_1", name: "New", email: "" }, ctx);
  assertEquals(calls[0].url, "https://api.stripe.com/v1/customers/cus_1");
  // Stripe updates are POSTs, and a blank form field must not blank the record.
  assertEquals(calls[0].body, "name=New");
});
