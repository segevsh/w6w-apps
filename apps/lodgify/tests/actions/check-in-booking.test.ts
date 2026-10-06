import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import checkIn from "../../actions/check-in-booking.ts";

Deno.test("check-in-booking: PUTs the v2 time body, validating HH:mm:ss", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await checkIn.execute({ bookingId: 3, time: "15:00:00" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/reservations/bookings/3/checkin");
  assertEquals(JSON.parse(calls[0].body!), { time: "15:00:00" });
  await assertRejects(
    () => Promise.resolve(checkIn.execute({ bookingId: 3, time: "3pm" }, ctx)),
    Error,
    "HH:mm:ss",
  );
  assertEquals(calls.length, 1);
});
