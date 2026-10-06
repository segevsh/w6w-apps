import { assertEquals } from "@std/assert";
import action from "../../actions/coupon-get.ts";
import { envelope, exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("coupon-get: gets one coupon by id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 1250, codes: [{ code: "A" }] }) }]);
  const out = await exec(action, { couponId: "1250" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/public/coupons/1250");
  assertEquals(out.coupon, { id: 1250, codes: [{ code: "A" }] });
});
