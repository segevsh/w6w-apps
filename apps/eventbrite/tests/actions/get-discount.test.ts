import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-discount.ts";

Deno.test("get-discount: GETs /discounts/{id}/", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d1" } }]);
  const result = await action.execute!({ discountId: "d/1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/discounts/d%2F1/");
  assertEquals(result, { id: "d1" });
});
