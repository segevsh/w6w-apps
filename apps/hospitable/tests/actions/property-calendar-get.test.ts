import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import propertyCalendarGet from "../../actions/property-calendar-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("property-calendar-get: GET .../calendar with a date window", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { days: [] } } }]);
  await propertyCalendarGet.execute({
    uuid: "p1",
    start_date: "2026-11-01",
    end_date: "2026-11-30",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/properties/p1/calendar");
  assertEquals(queryOf(calls[0].url), { start_date: "2026-11-01", end_date: "2026-11-30" });
});
