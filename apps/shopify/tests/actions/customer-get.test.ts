import { assertEquals } from "@std/assert";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/customer-get.ts";

Deno.test("customer-get: GETs /customers/{id}.json", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { customer: { id: 3 } } }]);
  await action.execute({ customerId: 3 }, ctx);
  assertEquals(calls[0].url, "https://acme.myshopify.com/admin/api/2024-07/customers/3.json");
});
