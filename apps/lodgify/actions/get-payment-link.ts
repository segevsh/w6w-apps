import type { ActionDefinition } from "@w6w/types";
import { LodgifyClient, requireNumber, segment } from "../lib/client.ts";

/**
 * Next payment link of a booking. Wraps `GET /v2/reservations/bookings/{id}/quote/paymentLink`
 * (GetPaymentLinkAsync, "Retrieve the next payment link for a Booking"). Response `{url}`.
 */
const action: ActionDefinition = {
  key: "get-payment-link",
  type: "read",
  resource: "quote",
  title: "Get a booking's payment link",
  description: "Read the next payment link for a booking.",
  params: [{ key: "bookingId", label: "Booking ID", type: "number", required: true }],
  output: [{ key: "url", type: "string", label: "Payment link" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = requireNumber(p.bookingId, "bookingId");
    return await new LodgifyClient(ctx).request(
      `/v2/reservations/bookings/${segment(id)}/quote/paymentLink`,
    );
  },
};

export default action;
