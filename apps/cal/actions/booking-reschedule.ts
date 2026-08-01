import type { ActionDefinition } from "@w6w/types";
import { CAL_API_VERSION, CalClient } from "../lib/client.ts";

interface Input {
  bookingUid: string;
  start: string;
  reschedulingReason?: string;
  rescheduledBy?: string;
}

/**
 * POST /v2/bookings/{bookingUid}/reschedule — move a booking to a new start
 * time. `cal-api-version: 2026-02-25`. Returns the *new* booking (rescheduling
 * cancels the original and creates a fresh UID), so this is intentionally not
 * marked idempotent — retrying would reschedule twice.
 */
const bookingReschedule: ActionDefinition<Input> = {
  key: "booking-reschedule",
  type: "perform",
  resource: "booking",
  title: "Reschedule Booking",
  description: "Move a booking to a new start time (POST /bookings/{uid}/reschedule).",
  idempotent: false,
  params: [
    { key: "bookingUid", label: "Booking UID", type: "string", required: true },
    { key: "start", label: "New start time", type: "datetime", required: true, hint: "ISO 8601." },
    { key: "reschedulingReason", label: "Rescheduling reason", type: "string" },
    {
      key: "rescheduledBy",
      label: "Rescheduled by (email)",
      type: "string",
      advanced: true,
    },
  ],
  output: [{ key: "data", type: "object", label: "New booking" }],

  execute(input, ctx) {
    return new CalClient(ctx).request(
      `/bookings/${encodeURIComponent(input.bookingUid)}/reschedule`,
      {
        method: "POST",
        headers: { "cal-api-version": CAL_API_VERSION.bookings },
        body: {
          start: input.start,
          reschedulingReason: input.reschedulingReason,
          rescheduledBy: input.rescheduledBy,
        },
      },
    );
  },
};

export default bookingReschedule;
