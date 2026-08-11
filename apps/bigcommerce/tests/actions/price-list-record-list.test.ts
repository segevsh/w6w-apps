import { assert, assertEquals } from "@std/assert";
import priceListRecordList from "../../actions/price-list-record-list.ts";
import { mockCtx, pathOf, queryOf, v3Page } from "../_helpers.ts";

Deno.test("price-list-record-list: GETs the records under one price list", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([{ variant_id: 9, currency: "usd" }]) }]);
  const out = await priceListRecordList.execute({ priceListId: 1, currency: "usd" }, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/pricelists/1/records");
  assertEquals(queryOf(calls[0].url), { currency: "usd" });
  assertEquals(out.data.length, 1);
});

Deno.test("price-list-record-list: filters are :in lists", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([]) }]);
  await priceListRecordList.execute({ priceListId: 2, variantIds: "9,10", skus: "A,B" }, ctx);
  assertEquals(queryOf(calls[0].url), { "variant_id:in": "9,10", "sku:in": "A,B" });
});

Deno.test("price-list-record-list: says records are keyed by variant AND currency", () => {
  const currency = priceListRecordList.params?.find((p) => p.key === "currency");
  assert(currency?.hint?.includes("one row per currency"), currency?.hint);
});
