import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/availability-time-get-many.ts";

Deno.test("availability-time-get-many: GETs /availability/times with required filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ time: "2026-08-15T13:00:00-0700" }] }]);
  const result = await action.execute({ date: "2026-08-15", appointmentTypeID: 7 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/availability/times");
  assertEquals(url.searchParams.get("date"), "2026-08-15");
  assertEquals(url.searchParams.get("appointmentTypeID"), "7");
  assertEquals(result, [{ time: "2026-08-15T13:00:00-0700" }]);
});

Deno.test("availability-time-get-many: serializes addonIDs and ignoreAppointmentIDs as arrays", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute(
    {
      date: "2026-08-15",
      appointmentTypeID: 7,
      addonIDs: [1, 2],
      ignoreAppointmentIDs: [99],
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("addonIDs[]"), ["1", "2"]);
  assertEquals(url.searchParams.getAll("ignoreAppointmentIDs[]"), ["99"]);
});
