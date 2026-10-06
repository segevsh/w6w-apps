import type { ActionDefinition } from "@w6w/types";
import { encodeId, ProductiveClient } from "../lib/client.ts";
import { deleteOutput } from "../lib/params.ts";

/**
 * Delete a booking (`DELETE /bookings/{id}`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
}

const bookingDelete: ActionDefinition<Input> = {
  key: "booking-delete",
  type: "perform",
  resource: "booking",
  title: "Delete Booking",
  description: "Delete a booking (`DELETE /bookings/{id}`).",
  idempotent: true,
  params: [{ key: "id", label: "Booking ID", type: "string", required: true }],
  output: deleteOutput,

  execute(input, ctx) {
    return new ProductiveClient(ctx).remove(`/bookings/${encodeId(input.id)}`, input.id);
  },
};

export default bookingDelete;
