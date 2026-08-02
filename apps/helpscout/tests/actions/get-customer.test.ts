import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-customer.ts";

Deno.test("get-customer: GETs /customers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 500, firstName: "Vernon" } }]);
  const out = await action.execute({ customerId: 500 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/customers/500");
  assertEquals(out, { id: 500, firstName: "Vernon" });
});
