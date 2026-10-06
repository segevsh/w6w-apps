import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-discount.ts";

Deno.test("update-discount: posts discount to /discounts/{id}/", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d1" } }]);
  const result = await action.execute!({ discountId: "d1", code: "NEW", amountOff: "5.00" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v3/discounts/d1/");
  assertEquals(JSON.parse(calls[0].body!), { discount: { code: "NEW", amount_off: "5.00" } });
  assertEquals(result, { id: "d1" });
});
