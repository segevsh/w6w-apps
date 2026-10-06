import type { ActionDefinition } from "@w6w/types";
import { LodgifyClient, requireNumber, segment } from "../lib/client.ts";

/**
 * Trash a booking. Wraps `DELETE /v1/reservation/booking/{id}`: "Moves a booking to the
 * trash. The booking is not permanently deleted and can be restored later" (restore with
 * the `recover` status transition in `change-booking-status`).
 */
const action: ActionDefinition = {
  key: "delete-booking",
  type: "perform",
  idempotent: true,
  resource: "booking",
  title: "Move a booking to the trash",
  description: "Move a booking to the trash. It is not permanently deleted and can be recovered.",
  params: [{ key: "bookingId", label: "Booking ID", type: "number", required: true }],
  output: [{ key: "ok", type: "boolean", label: "Moved to trash" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = requireNumber(p.bookingId, "bookingId");
    return await new LodgifyClient(ctx).command(`/v1/reservation/booking/${segment(id)}`, {
      method: "DELETE",
    });
  },
};

export default action;
