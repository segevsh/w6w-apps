import { assertEquals } from "@std/assert";
import catalogSummaryGet from "../../actions/catalog-summary-get.ts";
import { mockCtx, pathOf, v3Envelope } from "../_helpers.ts";

Deno.test("catalog-summary-get: GETs the summary and unwraps it", async () => {
  const { ctx, calls } = mockCtx([{
    body: v3Envelope({ inventory_count: 40, variant_count: 12, primary_category_name: "Mugs" }),
  }]);
  const out = await catalogSummaryGet.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/catalog/summary");
  assertEquals(out, { inventory_count: 40, variant_count: 12, primary_category_name: "Mugs" });
});

Deno.test("catalog-summary-get: takes no params, so a host can invoke it with {}", () => {
  assertEquals(catalogSummaryGet.params, []);
  assertEquals(catalogSummaryGet.type, "read");
});
