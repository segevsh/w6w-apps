import type { ActionDefinition } from "@w6w/types";
import { LodgifyClient, requireNumber, segment } from "../lib/client.ts";

/**
 * The quote attached to a booking. Wraps `GET /v1/reservation/booking/{id}/quote`
 * (GetQuoteByBookingId). The deprecated `expiration_hours` field is returned as the
 * vendor sends it; `guest_expiration_hours` / `owner_expiration_hours` replace it.
 */
const action: ActionDefinition = {
  key: "get-booking-quote",
  type: "read",
  resource: "quote",
  title: "Get a booking's quote",
  description: "Read the current quote of a booking: status, amounts, per-room prices, " +
    "add-ons and expiry.",
  params: [{ key: "bookingId", label: "Booking ID", type: "number", required: true }],
  output: [
    { key: "id", type: "number", label: "Quote ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount_gross", type: "object", label: "Gross amount" },
    { key: "room_type_items", type: "array", label: "Room items" },
    { key: "add_on_items", type: "array", label: "Add-on items" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = requireNumber(p.bookingId, "bookingId");
    return await new LodgifyClient(ctx).request(`/v1/reservation/booking/${segment(id)}/quote`);
  },
};

export default action;
