import { assertEquals } from "@std/assert";
import discountCouponSearch from "../../actions/discount-coupon-search.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("discount-coupon-search: calls GET /discount_coupons", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([{ id: 162428889, code: "SUMMER" }]) }]);
  const out = await discountCouponSearch.execute({ limit: 50 }, ctx) as { items: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/discount_coupons");
  assertEquals(queryOf(calls[0].url), { limit: "50" });
  assertEquals(out.items, [{ id: 162428889, code: "SUMMER" }]);
});

Deno.test("discount-coupon-search: the filter names are the underscore ones, not the body's", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([]) }]);
  await discountCouponSearch.execute(
    { code: "SUMMER", discount_type: "PERCENT", availability: "ACTIVE" },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    code: "SUMMER",
    discount_type: "PERCENT",
    availability: "ACTIVE",
  });
  const keys = (discountCouponSearch.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("discount_type"), true);
  assertEquals(keys.includes("availability"), true);
});
