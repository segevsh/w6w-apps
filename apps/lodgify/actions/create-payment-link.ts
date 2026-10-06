import type { ActionDefinition } from "@w6w/types";
import { LodgifyClient, requireNumber, segment } from "../lib/client.ts";

/**
 * Create a payment link. Wraps `POST /v2/reservations/bookings/{id}/quote/paymentLink`
 * (CreatePaymentLinkAsync); body `{amount}` (double); response `{succeeded}`. Read the
 * link afterwards with `get-payment-link`.
 */
const action: ActionDefinition = {
  key: "create-payment-link",
  type: "perform",
  idempotent: false,
  resource: "quote",
  title: "Create a payment link",
  description: "Create a payment link for an amount on a booking's quote.",
  params: [
    { key: "bookingId", label: "Booking ID", type: "number", required: true },
    { key: "amount", label: "Amount", type: "number", required: true },
  ],
  output: [{ key: "succeeded", type: "boolean", label: "Created" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = requireNumber(p.bookingId, "bookingId");
    return await new LodgifyClient(ctx).request(
      `/v2/reservations/bookings/${segment(id)}/quote/paymentLink`,
      { method: "POST", body: { amount: requireNumber(p.amount, "amount") } },
    );
  },
};

export default action;
