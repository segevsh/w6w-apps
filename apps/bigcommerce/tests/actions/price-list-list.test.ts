import { assertEquals } from "@std/assert";
import priceListList from "../../actions/price-list-list.ts";
import { mockCtx, pathOf, queryOf, v3Page } from "../_helpers.ts";

Deno.test("price-list-list: GETs /v3/pricelists", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([{ id: 1, name: "Wholesale" }]) }]);
  const out = await priceListList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/pricelists");
  assertEquals(out.data, [{ id: 1, name: "Wholesale" }]);
});

Deno.test("price-list-list: name filters map to the vendor's names", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([]) }]);
  await priceListList.execute({ nameLike: "Whole", ids: "1,2", limit: 25 }, ctx);
  assertEquals(queryOf(calls[0].url), { "name:like": "Whole", "id:in": "1,2", limit: "25" });
});
