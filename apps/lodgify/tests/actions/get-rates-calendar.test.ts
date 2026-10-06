import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import getRatesCalendar from "../../actions/get-rates-calendar.ts";

Deno.test("get-rates-calendar: sends houseId, roomTypeId, startDate, endDate", async () => {
  const { ctx, calls } = mockCtx([{ body: { calendar_items: [], rate_settings: {} } }]);
  await getRatesCalendar.execute({
    propertyId: 5,
    roomTypeId: 6,
    startDate: "2026-07-01",
    endDate: "2026-07-31",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rates/calendar");
  assertEquals(queryOf(calls[0].url), {
    houseId: "5",
    roomTypeId: "6",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
  });
});

Deno.test("get-rates-calendar: every documented-required parameter is required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(getRatesCalendar.execute({ propertyId: 1, roomTypeId: 2 }, ctx)),
    Error,
    "startDate",
  );
  assertEquals(calls.length, 0);
});
