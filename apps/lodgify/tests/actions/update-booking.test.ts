import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import updateBooking from "../../actions/update-booking.ts";

Deno.test("update-booking: sends only the fields set, PUT /v1/reservation/booking/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  await updateBooking.execute({ bookingId: 8, firstName: "Grace", note: "late arrival" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/reservation/booking/8");
  assertEquals(JSON.parse(calls[0].body!), {
    guest: { guest_name: { first_name: "Grace" } },
    note: "late arrival",
  });
});

Deno.test("update-booking: an update with no fields is refused", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(updateBooking.execute({ bookingId: 8 }, ctx)),
    Error,
    "at least one field",
  );
  assertEquals(calls.length, 0);
});
