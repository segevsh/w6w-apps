import { assertEquals } from "@std/assert";
import action from "../../actions/coupon-list-global.ts";
import { envelope, exec, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("coupon-list-global: sends the product and coupon filters", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 1 }], { hasMore: false }) }]);
  const out = await exec(action, {
    product: "regfox.com",
    code: "SAVE10",
    availableGreaterThan: 5,
    dateExpiresBefore: "2026-12-31",
    limit: 5,
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/public/coupons/global");
  const q = queryOf(calls[0].url);
  assertEquals(q.product, "regfox.com");
  assertEquals(q.code, "SAVE10");
  assertEquals(q.availableGreaterThan, "5");
  assertEquals(q.dateExpiresBefore, "2026-12-31");
  assertEquals(out.coupons, [{ id: 1 }]);
  assertEquals(out.hasMore, false);
});
