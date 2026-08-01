import type { ActionDefinition } from "@w6w/types";
import { CAL_API_VERSION, CalClient } from "../lib/client.ts";

interface Input {
  bookingUid: string;
  cancellationReason?: string;
  cancelSubsequentBookings?: boolean;
}

/**
 * POST /v2/bookings/{bookingUid}/cancel — cancel a booking.
 * `cal-api-version: 2026-02-25`.
 */
const bookingCancel: ActionDefinition<Input> = {
  key: "booking-cancel",
  type: "perform",
  resource: "booking",
  title: "Cancel Booking",
  description: "Cancel a booking by UID (POST /bookings/{uid}/cancel).",
  idempotent: true,
  params: [
    { key: "bookingUid", label: "Booking UID", type: "string", required: true },
    { key: "cancellationReason", label: "Cancellation reason", type: "string" },
    {
      key: "cancelSubsequentBookings",
      label: "Cancel subsequent recurrences",
      type: "boolean",
      advanced: true,
      hint: "Recurring, non-seated bookings only: also cancel every recurrence after this one.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Cancelled booking" }],

  execute(input, ctx) {
    return new CalClient(ctx).request(
      `/bookings/${encodeURIComponent(input.bookingUid)}/cancel`,
      {
        method: "POST",
        headers: { "cal-api-version": CAL_API_VERSION.bookings },
        body: {
          cancellationReason: input.cancellationReason,
          cancelSubsequentBookings: input.cancelSubsequentBookings,
        },
      },
    );
  },
};

export default bookingCancel;
