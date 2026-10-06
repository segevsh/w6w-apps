import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/order-list.ts";

const input = {
  "keyword": "v-keyword",
  "status": [1, 2],
  "payment_method": [1, 2],
  "from_date": "v-from_date",
  "to_date": "v-to_date",
  "country": 123,
  "city": "v-city",
  "product": "v-product",
  "branch": [1, 2],
  "tags": [1, 2],
  "reference_id": 123,
  "coupon": "v-coupon",
  "customer_id": 123,
  "sort_by": "id",
  "expanded": true,
  "page": 123,
  "per_page": 30,
} as never;

Deno.test("order-list: GET /orders", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "status": 200, "success": true, "data": { "id": 1 } },
  }]);
  const result = await action.execute!(input, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.salla.dev/admin/v2/orders");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(url.searchParams.get("keyword"), "v-keyword");
  assertEquals(url.searchParams.getAll("status[]"), ["1", "2"]);
  assertEquals(url.searchParams.getAll("payment_method[]"), ["1", "2"]);
  assertEquals(url.searchParams.get("from_date"), "v-from_date");
  assertEquals(url.searchParams.get("to_date"), "v-to_date");
  assertEquals(url.searchParams.get("country"), "123");
  assertEquals(url.searchParams.get("city"), "v-city");
  assertEquals(url.searchParams.get("product"), "v-product");
  assertEquals(url.searchParams.getAll("branch[]"), ["1", "2"]);
  assertEquals(url.searchParams.getAll("tags[]"), ["1", "2"]);
  assertEquals(url.searchParams.get("reference_id"), "123");
  assertEquals(url.searchParams.get("coupon"), "v-coupon");
  assertEquals(url.searchParams.get("customer_id"), "123");
  assertEquals(url.searchParams.get("sort_by"), "id");
  assertEquals(url.searchParams.get("expanded"), "true");
  assertEquals(url.searchParams.get("page"), "123");
  assertEquals(url.searchParams.get("per_page"), "30");
  assertEquals(calls[0].body, null);
  assertEquals(result, { "status": 200, "success": true, "data": { "id": 1 } });
});

Deno.test("order-list: unset filters add no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("order-list: a Salla error envelope throws with its message", async () => {
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
