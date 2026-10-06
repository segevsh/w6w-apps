import type { ActionDefinition } from "@w6w/types";
import { LodgifyClient, requireNumber, segment } from "../lib/client.ts";

/** Read one booking. Wraps `GET /v2/reservations/bookings/{id}` (GetAsync, "Booking by id"). */
const action: ActionDefinition = {
  key: "get-booking",
  type: "read",
  resource: "booking",
  title: "Get a booking",
  description: "Show one booking: dates, guest, rooms, status, source, totals and quote.",
  params: [{ key: "bookingId", label: "Booking ID", type: "number", required: true }],
  output: [
    { key: "id", type: "number", label: "Booking ID" },
    { key: "property_id", type: "number", label: "Property ID" },
    { key: "arrival", type: "string", label: "Arrival" },
    { key: "departure", type: "string", label: "Departure" },
    { key: "status", type: "string", label: "Status" },
    { key: "source", type: "string", label: "Source" },
    { key: "guest", type: "object", label: "Guest" },
    { key: "rooms", type: "array", label: "Rooms" },
    { key: "currency_code", type: "string", label: "Currency" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = requireNumber(p.bookingId, "bookingId");
    return await new LodgifyClient(ctx).request(`/v2/reservations/bookings/${segment(id)}`);
  },
};

export default action;
