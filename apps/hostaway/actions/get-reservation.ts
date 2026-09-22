import type { ActionDefinition } from "@w6w/types";
import { asNumber, HostawayClient, segment } from "../lib/client.ts";

/**
 * Read one reservation in full. Wraps `GET /v1/reservations/{reservationId}`.
 *
 * Response: "A reservation object." The docs add a note that matters when reading
 * fields off it:
 *
 *   "This endpoint always includes the cancellation policy fields —
 *   cancellationPolicyDetails (the immutable policy snapshot captured at booking time)
 *   and the channel-specific cancellation policy codes (bookingCancellationPolicy,
 *   vrboCancellationPolicy, marriottCancellationPolicy) — without requiring the
 *   includeCancellationPolicy parameter."
 *
 * No query parameters are documented for this path, so none are sent.
 */
const action: ActionDefinition = {
  key: "get-reservation",
  type: "read",
  resource: "reservation",
  title: "Get a reservation",
  description: "Show one reservation in full, including its cancellation policy snapshot.",
  params: [
    {
      key: "reservationId",
      label: "Reservation ID",
      type: "number",
      required: true,
      hint: "Hostaway's own reservation `id` (not the channel's reservation id).",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Reservation ID" },
    { key: "listingMapId", type: "number", label: "Listing ID" },
    { key: "channelId", type: "number", label: "Channel ID" },
    { key: "channelName", type: "string", label: "Channel name" },
    { key: "status", type: "string", label: "Status" },
    { key: "guestName", type: "string", label: "Guest name" },
    { key: "arrivalDate", type: "string", label: "Arrival date" },
    { key: "departureDate", type: "string", label: "Departure date" },
    { key: "totalPrice", type: "number", label: "Total price" },
    { key: "currency", type: "string", label: "Currency" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const reservationId = asNumber(p.reservationId);
    if (reservationId === undefined) throw new Error("`reservationId` is required");
    return await new HostawayClient(ctx).request(`/reservations/${segment(reservationId)}`);
  },
};

export default action;
