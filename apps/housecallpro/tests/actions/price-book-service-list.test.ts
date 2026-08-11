import { assertEquals } from "@std/assert";
import priceBookServiceList from "../../actions/price-book-service-list.ts";
import { mockCtx, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("price-book-service-list: reads the bare {services} shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { services: [{ id: "s1", name: "Drain clear" }] } }]);
  const out = await priceBookServiceList.execute({ q: "drain" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/price_book/services");
  assertEquals(queryOf(calls[0].url), { q: "drain" });
  assertEquals(out.items, [{ id: "s1", name: "Drain clear" }]);
});

/**
 * This is the endpoint whose own prose fixes the bracketed form for the whole
 * app: "Sent as repeated `expand[]` query params (e.g.
 * `expand[]=service_materials&expand[]=service_labor_rates`)".
 */
Deno.test("price-book-service-list: expand matches the vendor's worked example exactly", async () => {
  const { ctx, calls } = mockCtx([{ body: { services: [] } }]);
  await priceBookServiceList.execute(
    { expand: ["service_materials", "service_labor_rates"] },
    ctx,
  );

  assertEquals(
    decodeURIComponent(new URL(calls[0].url).search),
    "?expand[]=service_materials&expand[]=service_labor_rates",
  );
  assertEquals(queryAll(calls[0].url, "expand"), []);
});

Deno.test("price-book-service-list: exposes no filters param — deepObject is not implemented", () => {
  assertEquals((priceBookServiceList.params ?? []).some((p) => p.key === "filters"), false);
});
