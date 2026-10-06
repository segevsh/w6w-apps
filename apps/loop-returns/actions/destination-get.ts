import type { ActionDefinition } from "@w6w/types";
import { encodeId, LoopClient } from "../lib/client.ts";

/**
 * Get Destination.
 *
 * `GET /destinations/{id}` (Destinations (Read) scope).
 */
interface Input {
  destinationId: number;
}

const action: ActionDefinition<Input> = {
  key: "destination-get",
  type: "read",
  resource: "destination",
  title: "Get Destination",
  description: "Fetch one destination by ID.",
  params: [
    {
      key: "destinationId",
      label: "Destination ID",
      type: "number",
      required: true,
      hint: "Loop's destination id.",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Destination ID" },
    { key: "type", type: "string", label: "warehouse or donate" },
    { key: "name", type: "string", label: "Name" },
    { key: "enabled", type: "boolean", label: "Enabled" },
    { key: "address", type: "object", label: "Address" },
  ],

  execute(input, ctx) {
    return new LoopClient(ctx).get(`/destinations/${encodeId(input.destinationId)}`);
  },
};

export default action;
