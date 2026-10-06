import { assertEquals } from "@std/assert";
import propertyCalendarGet from "../../actions/property-calendar-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("property-calendar-get: GET .../calendar with a date window", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { days: [] } } }]);
  await propertyCalendarGet.execute({
    uuid: "p1",
    start_date: "2026-11-01",
    end_date: "2026-11-30",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/properties/p1/calendar");
  assertEquals(queryOf(calls[0].url), { start_date: "2026-11-01", end_date: "2026-11-30" });
});
