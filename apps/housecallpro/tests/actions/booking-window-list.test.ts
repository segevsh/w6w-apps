import { assertEquals } from "@std/assert";
import bookingWindowList from "../../actions/booking-window-list.ts";
import { mockCtx, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("booking-window-list: calls the nested availability path", async () => {
  const { ctx, calls } = mockCtx([
    { body: { booking_windows: [], show_for_days: 7, start_date: "2026-03-24T08:00:00" } },
  ]);
  const out = await bookingWindowList.execute({ showForDays: 14 }, ctx) as {
    show_for_days: number;
  };

  assertEquals(pathOf(calls[0].url), "/company/schedule_availability/booking_windows");
  assertEquals(queryOf(calls[0].url), { show_for_days: "14" });
  assertEquals(out.show_for_days, 7);
});

Deno.test("booking-window-list: service duration and service id are sent independently", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await bookingWindowList.execute(
    { serviceId: "s1", serviceDuration: 90, employeeIds: "e1,e2" },
    ctx,
  );

  assertEquals(queryOf(calls[0].url).service_id, "s1");
  assertEquals(queryOf(calls[0].url).service_duration, "90");
  assertEquals(queryAll(calls[0].url, "employee_ids[]"), ["e1", "e2"]);
});

Deno.test("booking-window-list: documents the duration resolution order in the duration hint", () => {
  const p = bookingWindowList.params?.find((x) => x.key === "serviceDuration");
  assertEquals(p?.hint?.includes("Overrides"), true);
  assertEquals(p?.hint?.includes("30 minutes"), true);
});
