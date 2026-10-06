import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, LodgifyClient, requireNumber, segment } from "../lib/client.ts";

/**
 * Create a quote for a booking. Wraps `POST /v1/reservation/booking/{id}/quote`. Body:
 * `is_policy_active`, `add_ons[{add_on_id, units}]`, `room_types[{room_type_id,
 * custom_fee_amount}]`. Answers 201 with the new quote id as a bare integer. The
 * `custom_fee_amount` value is a Lodgify `Money` object the document does not define
 * further, so `room_types` is passed through as written.
 */
const action: ActionDefinition = {
  key: "create-booking-quote",
  type: "perform",
  idempotent: false,
  resource: "quote",
  title: "Create a quote for a booking",
  description: "Create a new quote for an existing booking, optionally with add-ons and a " +
    "rate policy.",
  params: [
    { key: "bookingId", label: "Booking ID", type: "number", required: true },
    { key: "isPolicyActive", label: "Apply rate policy", type: "boolean" },
    {
      key: "addOns",
      label: "Add-ons",
      type: "json",
      hint: 'Array of {"add_on_id": 5, "units": 2}.',
    },
    {
      key: "roomTypes",
      label: "Room types",
      type: "json",
      hint: 'Array of {"room_type_id": 1, "custom_fee_amount": {...}}.',
    },
  ],
  output: [{ key: "id", type: "number", label: "New quote ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = requireNumber(p.bookingId, "bookingId");
    return await new LodgifyClient(ctx).created(`/v1/reservation/booking/${segment(id)}/quote`, {
      method: "POST",
      body: compact({
        is_policy_active: typeof p.isPolicyActive === "boolean" ? p.isPolicyActive : undefined,
        add_ons: asOptionalJson<unknown[]>(p.addOns, "addOns"),
        room_types: asOptionalJson<unknown[]>(p.roomTypes, "roomTypes"),
      }),
    });
  },
};

export default action;
