import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/appointment-get-many.ts";

Deno.test("appointment-get-many: GETs /appointments with mapped filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute(
    {
      max: 10,
      minDate: "2026-08-01",
      maxDate: "2026-08-31",
      calendarID: 5,
      appointmentTypeID: 7,
      canceled: true,
      firstName: "Jane",
      email: "jane@example.com",
      direction: "ASC",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/appointments");
  assertEquals(url.searchParams.get("max"), "10");
  assertEquals(url.searchParams.get("minDate"), "2026-08-01");
  assertEquals(url.searchParams.get("maxDate"), "2026-08-31");
  assertEquals(url.searchParams.get("calendarID"), "5");
  assertEquals(url.searchParams.get("appointmentTypeID"), "7");
  assertEquals(url.searchParams.get("canceled"), "true");
  assertEquals(url.searchParams.get("firstName"), "Jane");
  assertEquals(url.searchParams.get("email"), "jane@example.com");
  assertEquals(url.searchParams.get("direction"), "ASC");
});

Deno.test("appointment-get-many: omits unset filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("calendarID"), false);
  assertEquals(url.searchParams.has("firstName"), false);
});
