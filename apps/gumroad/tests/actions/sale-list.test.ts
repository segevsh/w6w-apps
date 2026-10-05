import { assertEquals, assertRejects } from "@std/assert";
import saleList from "../../actions/sale-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "after": "after-1",
  "before": "before-1",
  "productId": "productId-1==",
  "email": "email-1",
  "orderId": "orderId-1==",
  "name": "name-1",
  "licenseKey": "licenseKey-1",
  "pageKey": "pageKey-1",
};

Deno.test("sale-list: sends GET /v2/sales with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "sales": [{ "id": "a" }], "next_page_key": "nk-1" },
  }]);
  await saleList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/sales");
  assertEquals(queryOf(calls[0].url), {
    "after": "after-1",
    "before": "before-1",
    "product_id": "productId-1==",
    "email": "email-1",
    "order_id": "orderId-1==",
    "name": "name-1",
    "license_key": "licenseKey-1",
    "page_key": "pageKey-1",
  });
  assertEquals(calls[0].body, null);
});

Deno.test("sale-list: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{
    body: { "success": true, "sales": [{ "id": "a" }], "next_page_key": "nk-1" },
  }]);
  assertEquals(await saleList.execute(INPUT, ctx), {
    "sales": [{ "id": "a" }],
    "nextPageKey": "nk-1",
  });
});

Deno.test("sale-list: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(saleList.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("sale-list: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(saleList.execute(INPUT, ctx)), Error, "refused");
});
