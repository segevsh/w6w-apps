import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-get.ts";

const display = { storeUrl: "https://shop.example.com" };

Deno.test("customer-get: GETs /customers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 3 } }], { display });
  const result = await action.execute!({ customerId: "3" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wc/v3/customers/3");
  assertEquals(result, { id: 3 });
});
