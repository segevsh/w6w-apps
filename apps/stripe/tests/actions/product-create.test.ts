import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/product-create.ts";

Deno.test("product-create: POSTs /products", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "prod_1" } }]);
  await action.execute({ name: "Pro plan", active: true }, ctx);
  assertEquals(calls[0].url, "https://api.stripe.com/v1/products");
  // encodeURIComponent yields %20 for a space; form-urlencoded decoders
  // (Stripe's included) accept it interchangeably with "+".
  assertEquals(calls[0].body, "name=Pro%20plan&active=true");
});
