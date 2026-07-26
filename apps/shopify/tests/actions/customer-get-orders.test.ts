import { assertEquals } from "@std/assert";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/customer-get-orders.ts";

Deno.test("customer-get-orders: GETs the customer's orders sub-resource", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { orders: [] } }]);
  await action.execute({ customerId: 3, status: "any" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/admin/api/2024-07/customers/3/orders.json");
  assertEquals(new URL(calls[0].url).searchParams.get("status"), "any");
});
