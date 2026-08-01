import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/booking-reschedule.ts";

Deno.test("booking-reschedule: POSTs /bookings/{uid}/reschedule with cal-api-version 2026-02-25", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { uid: "new-uid" } } }]);
  const result = await action.execute(
    { bookingUid: "abc", start: "2026-08-15T10:00:00Z" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/bookings/abc/reschedule");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["cal-api-version"], "2026-02-25");
  assertEquals(result, { data: { uid: "new-uid" } });

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.start, "2026-08-15T10:00:00Z");
});

Deno.test("booking-reschedule: forwards reschedulingReason and rescheduledBy", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute(
    {
      bookingUid: "abc",
      start: "2026-08-15T10:00:00Z",
      reschedulingReason: "attendee request",
      rescheduledBy: "owner@example.com",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.reschedulingReason, "attendee request");
  assertEquals(body.rescheduledBy, "owner@example.com");
});

Deno.test("booking-reschedule: is declared non-idempotent (creates a new booking)", () => {
  assertEquals(action.idempotent, false);
});
