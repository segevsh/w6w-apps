import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/coupon-list.ts";

const input = { "keyword": "v-keyword", "page": 123, "per_page": 30 } as never;

Deno.test("coupon-list: GET /coupons", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "status": 200, "success": true, "data": { "id": 1 } },
  }]);
  const result = await action.execute!(input, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.salla.dev/admin/v2/coupons");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(url.searchParams.get("keyword"), "v-keyword");
  assertEquals(url.searchParams.get("page"), "123");
  assertEquals(url.searchParams.get("per_page"), "30");
  assertEquals(calls[0].body, null);
  assertEquals(result, { "status": 200, "success": true, "data": { "id": 1 } });
});

Deno.test("coupon-list: unset filters add no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("coupon-list: a Salla error envelope throws with its message", async () => {
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
