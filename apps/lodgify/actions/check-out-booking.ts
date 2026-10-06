import type { ActionDefinition } from "@w6w/types";
import { LodgifyClient, requireNumber, requireText, segment } from "../lib/client.ts";

/**
 * Check out a booking at a given time. Wraps `PUT /v2/reservations/bookings/{id}/checkout`; body
 * `{time}`, "Time of the checkout (in the property's timezone). Use format HH:mm:ss".
 */
const action: ActionDefinition = {
  key: "check-out-booking",
  type: "perform",
  idempotent: true,
  resource: "booking",
  title: "Check out a booking",
  description: "Record that a booking was checked out at a time of day in the property's timezone.",
  params: [
    { key: "bookingId", label: "Booking ID", type: "number", required: true },
    {
      key: "time",
      label: "Time",
      type: "string",
      required: true,
      placeholder: "15:00:00",
      hint: "HH:mm:ss, in the property's timezone.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Recorded" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = requireNumber(p.bookingId, "bookingId");
    const time = requireText(p.time, "time");
    if (!/^\d{1,2}:\d{2}:\d{2}$/.test(time)) throw new Error("`time` must be HH:mm:ss");
    return await new LodgifyClient(ctx).command(
      `/v2/reservations/bookings/${segment(id)}/checkout`,
      { method: "PUT", body: { time } },
    );
  },
};

export default action;
