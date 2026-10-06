import { assertEquals } from "@std/assert";
import propertySearch from "../../actions/property-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const requiredOf = (a: { params?: Array<{ key: string; required?: boolean }> }) =>
  (a.params ?? []).filter((p) => p.required).map((p) => p.key).sort();

Deno.test("property-search: dates, guests and the deepObject location reach the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await propertySearch.execute({
    start_date: "2026-11-01",
    end_date: "2026-11-05",
    adults: 2,
    children: 1,
    pets: 0,
    latitude: 41.5,
    longitude: -8.4,
    site_url: "https://x.hospitable.rentals",
    include: "details",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/properties/search");
  assertEquals(queryOf(calls[0].url), {
    start_date: "2026-11-01",
    end_date: "2026-11-05",
    adults: "2",
    children: "1",
    pets: "0",
    "location[latitude]": "41.5",
    "location[longitude]": "-8.4",
    site_url: "https://x.hospitable.rentals",
    include: "details",
  });
  assertEquals(requiredOf(propertySearch), ["adults", "end_date", "start_date"]);
});
