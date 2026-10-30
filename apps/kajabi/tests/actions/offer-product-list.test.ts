import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import offerProductList from "../../actions/offer-product-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("offer-product-list: GETs the relationship route", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "3", type: "products" }] } }]);
  await offerProductList.execute({ offerId: "7" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/offers/7/relationships/products");
});

test("offer-product-list: an id with a slash is percent-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await offerProductList.execute({ offerId: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/offers/a%2Fb/relationships/products");
});
