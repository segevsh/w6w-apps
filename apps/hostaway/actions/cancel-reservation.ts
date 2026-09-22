import type { ActionDefinition } from "@w6w/types";
import { asNumber, HostawayClient, segment } from "../lib/client.ts";

/**
 * Cancel a reservation. Wraps `PUT /v1/reservations/{reservationId}/statuses/cancelled`.
 *
 * Verbatim: "`cancelledBy` JSON body parameter should be specified with value host or
 * guest." The docs' own request example body is `{"cancelledBy": "guest"}`.
 *
 * Response: the updated reservation object (the docs' note on the Retrieve-a-reservation
 * section says the cancellation-policy fields are always included on create, update and
 * cancel responses). Note that the docs also say a cancellation "does not block the
 * calendar" — the freed dates are the calendar's business, not this call's.
 *
 * Not built (deliberately): the sibling status transitions
 * `.../statuses/cancelledDueToInvalidCreditCard`, `.../statuses/noShow`, and
 * `DELETE /v1/reservations/{id}` — none is in this app's action set.
 */
const action: ActionDefinition = {
  key: "cancel-reservation",
  type: "perform",
  resource: "reservation",
  title: "Cancel a reservation",
  description: "Cancel one reservation, recording whether the host or the guest cancelled.",
  idempotent: true,
  params: [
    { key: "reservationId", label: "Reservation ID", type: "number", required: true },
    {
      key: "cancelledBy",
      label: "Cancelled by",
      type: "select",
      required: true,
      options: [
        { value: "host", label: "Host" },
        { value: "guest", label: "Guest" },
      ],
      hint: "Hostaway accepts only `host` or `guest` here.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Reservation ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "cancelledBy", type: "string", label: "Cancelled by" },
    { key: "updatedOn", type: "string", label: "Last updated" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const reservationId = asNumber(p.reservationId);
    if (reservationId === undefined) throw new Error("`reservationId` is required");
    const cancelledBy = String(p.cancelledBy ?? "").trim();
    if (cancelledBy !== "host" && cancelledBy !== "guest") {
      throw new Error('`cancelledBy` must be "host" or "guest"');
    }

    return await new HostawayClient(ctx).request(
      `/reservations/${segment(reservationId)}/statuses/cancelled`,
      { method: "PUT", body: { cancelledBy } },
    );
  },
};

export default action;
