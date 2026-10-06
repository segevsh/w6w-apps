import { assertEquals } from "@std/assert";
import propertyCalendarUpdate from "../../actions/property-calendar-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("property-calendar-update: PUT .../calendar sends dates, parsing JSON text; 202 body passes through", async () => {
  const dates = [{ date: "2026-11-01", price: { amount: 15000 }, available: true, min_stay: 2 }];
  const { ctx, calls } = mockCtx([{ status: 202, body: { status: "accepted" } }]);
  const out = await propertyCalendarUpdate.execute(
    { uuid: "p1", dates: JSON.stringify(dates) },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/properties/p1/calendar");
  assertEquals(JSON.parse(calls[0].body!), { dates });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals((out as { status: string }).status, "accepted");
  assertEquals(propertyCalendarUpdate.idempotent, true);

  const arr = mockCtx([{ status: 202, body: { status: "accepted" } }]);
  await propertyCalendarUpdate.execute({ uuid: "p1", dates }, arr.ctx);
  assertEquals(JSON.parse(arr.calls[0].body!), { dates });
});
