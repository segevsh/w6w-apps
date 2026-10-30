import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pathOf } from "../_helpers.ts";
import getBooking from "../../actions/get-booking.ts";

test("get-booking: GETs /v2/reservations/bookings/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 11, status: "Booked" } }]);
  const out = await getBooking.execute({ bookingId: 11 }, ctx) as { status: string };
  assertEquals(pathOf(calls[0].url), "/v2/reservations/bookings/11");
  assertEquals(out.status, "Booked");
});
