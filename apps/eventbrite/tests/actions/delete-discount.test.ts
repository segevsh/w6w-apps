import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-discount.ts";

Deno.test("delete-discount: DELETEs the discount", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d1" } }]);
  const result = await action.execute!({ discountId: "d1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.pathname, "/v3/discounts/d1/");
  assertEquals(result, { id: "d1" });
});
