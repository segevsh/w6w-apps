import { assertEquals } from "@std/assert";
import action from "../../actions/coupon-list-form.ts";
import { envelope, exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("coupon-list-form: uses the plural /coupons/forms/ path the live API serves", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 9 }]) }]);
  const out = await exec(action, { formId: "28609" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/public/coupons/forms/28609");
  assertEquals(out.coupons, [{ id: 9 }]);
});
