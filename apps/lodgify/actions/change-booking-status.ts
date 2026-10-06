import type { ActionDefinition } from "@w6w/types";
import { LodgifyClient, requireNumber, requireText, segment } from "../lib/client.ts";

/**
 * Move a booking through its lifecycle. Wraps the v1 status PUTs, none of which takes a
 * body:
 *
 *   - `PUT /v1/reservation/booking/{id}/book`      -> Booked (and updates the calendar);
 *                                                     optional `requestPayment` query
 *   - `PUT /v1/reservation/booking/{id}/tentative` -> Tentative; optional `requestPayment`
 *   - `PUT /v1/reservation/booking/{id}/decline`   -> Declined
 *   - `PUT /v1/reservation/booking/{id}/reopen`    -> Open again
 *   - `PUT /v1/reservation/booking/{id}/recover`   -> restore from the trash
 *
 * `requestPayment` is only documented on `book` and `tentative`; it is ignored for the
 * others rather than sent where the document does not list it.
 */
const TRANSITIONS = ["book", "tentative", "decline", "reopen", "recover"] as const;

const action: ActionDefinition = {
  key: "change-booking-status",
  type: "perform",
  idempotent: true,
  resource: "booking",
  title: "Change a booking's status",
  description: "Mark a booking booked, tentative, declined or open again, or recover it from " +
    "the trash.",
  params: [
    { key: "bookingId", label: "Booking ID", type: "number", required: true },
    {
      key: "transition",
      label: "Transition",
      type: "select",
      required: true,
      options: [
        { value: "book", label: "Set as Booked" },
        { value: "tentative", label: "Set as Tentative" },
        { value: "decline", label: "Decline" },
        { value: "reopen", label: "Reopen" },
        { value: "recover", label: "Recover from trash" },
      ],
    },
    {
      key: "requestPayment",
      label: "Request payment",
      type: "boolean",
      hint: "Only applies to Booked and Tentative.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Status changed" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = requireNumber(p.bookingId, "bookingId");
    const transition = requireText(p.transition, "transition");
    if (!(TRANSITIONS as readonly string[]).includes(transition)) {
      throw new Error(`\`transition\` must be one of ${TRANSITIONS.join(", ")}`);
    }
    const takesPayment = transition === "book" || transition === "tentative";
    return await new LodgifyClient(ctx).command(
      `/v1/reservation/booking/${segment(id)}/${transition}`,
      {
        method: "PUT",
        query: { requestPayment: takesPayment && p.requestPayment === true ? true : undefined },
      },
    );
  },
};

export default action;
