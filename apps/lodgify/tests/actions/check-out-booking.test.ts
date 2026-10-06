import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import checkOut from "../../actions/check-out-booking.ts";

Deno.test("check-out-booking: PUTs the v2 time body, validating HH:mm:ss", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await checkOut.execute({ bookingId: 3, time: "10:30:00" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/reservations/bookings/3/checkout");
  assertEquals(JSON.parse(calls[0].body!), { time: "10:30:00" });
  await assertRejects(
    () => Promise.resolve(checkOut.execute({ bookingId: 3, time: "10:30" }, ctx)),
    Error,
    "HH:mm:ss",
  );
  assertEquals(calls.length, 1);
});
