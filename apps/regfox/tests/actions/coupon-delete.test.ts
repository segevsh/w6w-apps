import { assertEquals } from "@std/assert";
import action from "../../actions/coupon-delete.ts";
import { exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("coupon-delete: DELETE answering 204 with no body reports deleted", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await exec(action, { couponId: "4" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/public/coupons/4");
  assertEquals(out, { deleted: true });
  assertEquals(action.idempotent, true);
});

Deno.test("coupon-delete: a vendor error is not reported as deleted", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { responseCode: 404, error: { code: 4404, description: "coupon not found" } },
  }]);
  let msg = "";
  try {
    await exec(action, { couponId: "4" }, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("coupon not found"), true);
});
