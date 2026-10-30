import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockBookingsCtx } from "../_helpers.ts";
import action from "../../actions/appointment-update.ts";

test("appointment-update: POSTs booking_id and action as form fields", async () => {
  const { ctx, calls } = mockBookingsCtx([
    {
      body: {
        response: {
          status: "success",
          returnvalue: { booking_id: "#AN-00014", status: "upcoming" },
        },
      },
    },
  ]);
  await action.execute({ bookingId: "#AN-00014", action: "noshow" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/bookings/v1/json/updateappointment");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].form, { booking_id: "#AN-00014", action: "noshow" });
});

test("appointment-update: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
