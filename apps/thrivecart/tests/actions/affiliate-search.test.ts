import { assertEquals } from "@std/assert";
import affiliateSearch from "../../actions/affiliate-search.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("affiliate-search: calls GET /affiliates with the search params", async () => {
  const { ctx, calls } = mockCtx([
    { body: { affiliates: [{ user_id: "1" }], meta: { total: 1, results: 1 } } },
  ]);
  const out = await affiliateSearch.execute(
    { productId: "42", query: "jane", page: 1, perPage: 5 },
    ctx,
  ) as { affiliates: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/external/affiliates");
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("product_id"), "42");
  assertEquals(params.get("query"), "jane");
  assertEquals(out.affiliates.length, 1);
});
