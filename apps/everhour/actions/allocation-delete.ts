import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `DELETE /allocations/{allocationId}` — Delete a time-off allocation.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  allocationId: number;
}

const allocationDelete: ActionDefinition<Input> = {
  key: "allocation-delete",
  type: "perform",
  resource: "allocation",
  title: "Delete Time-Off Allocation",
  description: "Delete a time-off allocation.",
  idempotent: true,
  params: [
    {
      key: "allocationId",
      label: "Allocation ID",
      type: "number",
      required: true,
      hint: "Numeric time-off allocation id.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when the delete succeeded" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/allocations/${encodeId(input.allocationId)}`, {
      method: "DELETE",
    });
  },
};

export default allocationDelete;
