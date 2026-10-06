import type { ActionDefinition } from "@w6w/types";
import { encodeId, ProductiveClient } from "../lib/client.ts";
import { includeParam, resourceOutput } from "../lib/params.ts";

/**
 * Get one booking by id (`GET /bookings/{id}`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  include?: string;
}

const bookingGet: ActionDefinition<Input> = {
  key: "booking-get",
  type: "read",
  resource: "booking",
  title: "Get Booking",
  description: "Get one booking by id (`GET /bookings/{id}`).",
  params: [
    { key: "id", label: "Booking ID", type: "string", required: true },
    includeParam,
  ],
  output: resourceOutput("Booking"),

  async execute(input, ctx) {
    return await new ProductiveClient(ctx).one(`/bookings/${encodeId(input.id)}`, {
      query: { include: input.include },
    });
  },
};

export default bookingGet;
