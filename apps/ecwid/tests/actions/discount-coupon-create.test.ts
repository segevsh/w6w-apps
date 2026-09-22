import { assertEquals } from "@std/assert";
import discountCouponCreate from "../../actions/discount-coupon-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("discount-coupon-create: POSTs to /discount_coupons and returns id and code", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: 358845013, code: "MOXQ3YCWXRXA" } },
  ]);
  const out = await discountCouponCreate.execute(
    {
      name: "Coupon #1",
      code: "MOXQ3YCWXRXA",
      discountType: "ABS",
      status: "ACTIVE",
      discount: 1,
      usesLimit: "UNLIMITED",
      catalogLimit: { products: [37208342], categories: [] },
    },
    ctx,
  ) as { id: number; code: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/discount_coupons");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    name: "Coupon #1",
    code: "MOXQ3YCWXRXA",
    discountType: "ABS",
    status: "ACTIVE",
    discount: 1,
    usesLimit: "UNLIMITED",
    catalogLimit: { products: [37208342], categories: [] },
  });
  assertEquals(out, { id: 358845013, code: "MOXQ3YCWXRXA" });
});

Deno.test("discount-coupon-create: the four fields that make a coupon usable are required here", () => {
  for (const key of ["name", "code", "discountType", "status"]) {
    assertEquals(
      discountCouponCreate.params?.find((p) => p.key === key)?.required,
      true,
      `${key} is declared optional`,
    );
  }
});

Deno.test("discount-coupon-create: launch and expiration dates keep the vendor's format", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, code: "X" } }]);
  await discountCouponCreate.execute(
    {
      name: "n",
      code: "X",
      discountType: "PERCENT",
      status: "ACTIVE",
      launchDate: "2026-06-06 08:00:00 +0400",
      expirationDate: "2026-06-30 23:59:59 +0400",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.launchDate, "2026-06-06 08:00:00 +0400");
  assertEquals(body.expirationDate, "2026-06-30 23:59:59 +0400");
});
