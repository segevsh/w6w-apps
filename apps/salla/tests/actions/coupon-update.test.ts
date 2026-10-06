import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/coupon-update.ts";

const input = {
  "coupon_id": 123,
  "code": "v-code",
  "type": "percentage",
  "amount": 123,
  "free_shipping": true,
  "exclude_sale_products": true,
  "expiry_date": "v-expiry_date",
  "status": "v-status",
  "start_date": "v-start_date",
  "applied_in": "all",
  "usage_limit": 123,
  "usage_limit_per_user": 123,
  "minimum_amount": 123,
  "maximum_amount": 123,
  "additionalFields": { "extra_field": "x" },
} as never;

Deno.test("coupon-update: PUT /coupons/{coupon_id}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "status": 200, "success": true, "data": { "id": 1 } },
  }]);
  const result = await action.execute!(input, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.salla.dev/admin/v2/coupons/123");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "code": "v-code",
    "type": "percentage",
    "amount": 123,
    "free_shipping": true,
    "exclude_sale_products": true,
    "expiry_date": "v-expiry_date",
    "status": "v-status",
    "start_date": "v-start_date",
    "applied_in": "all",
    "usage_limit": 123,
    "usage_limit_per_user": 123,
    "minimum_amount": 123,
    "maximum_amount": 123,
    "extra_field": "x",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, { "status": 200, "success": true, "data": { "id": 1 } });
});

Deno.test("coupon-update: sends only the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute!({ "coupon_id": 123 } as never, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("coupon-update: a Salla error envelope throws with its message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      status: 422,
      success: false,
      error: { code: "error", message: "alert.invalid_fields", fields: { name: ["required"] } },
    },
  }]);
  let message = "";
  try {
    await action.execute!(input, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("alert.invalid_fields"), message);
  assert(message.includes("name: required"), message);
});
