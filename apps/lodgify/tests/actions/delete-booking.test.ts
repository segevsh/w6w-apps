import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import deleteBooking from "../../actions/delete-booking.ts";

Deno.test("delete-booking: DELETE /v1/reservation/booking/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await deleteBooking.execute({ bookingId: 8 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/reservation/booking/8");
  assertEquals(out, { ok: true });
});
