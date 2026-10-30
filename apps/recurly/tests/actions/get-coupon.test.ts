import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/get-coupon.ts";

test("get-coupon: is a read action requiring couponId", () => {
  assertEquals(action.key, "get-coupon");
  assertEquals(action.type, "read");
  const p = (action.params ?? []).find((p) => p.key === "couponId")!;
  assertEquals(p.required, true);
});

test("get-coupon: GETs /coupons/{id}, accepting a `code-` prefixed lookup", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "c1", code: "10off" } }]);
  await action.execute({ couponId: "code-10off" }, connected(ctx));
  assertEquals(new URL(calls[0].url).pathname, "/coupons/code-10off");
});
