import type { ActionDefinition } from "@w6w/types";
import { CAL_API_VERSION, CalClient } from "../lib/client.ts";

interface Input {
  bookingUid: string;
}

/**
 * GET /v2/bookings/{bookingUid} — a single booking (or, for a recurring
 * booking's group UID, every recurrence). `cal-api-version: 2026-02-25`.
 */
const bookingGet: ActionDefinition<Input> = {
  key: "booking-get",
  type: "read",
  resource: "booking",
  title: "Get Booking",
  description: "Fetch a single booking by its UID.",
  params: [
    {
      key: "bookingUid",
      label: "Booking UID",
      type: "string",
      required: true,
      hint: "A normal booking UID, one recurrence's UID, or a recurring booking's group UID.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Booking" }],

  execute(input, ctx) {
    return new CalClient(ctx).request(`/bookings/${encodeURIComponent(input.bookingUid)}`, {
      headers: { "cal-api-version": CAL_API_VERSION.bookings },
    });
  },
};

export default bookingGet;
