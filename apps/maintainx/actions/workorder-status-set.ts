import type { ActionDefinition } from "@w6w/types";
import { encodeId, MaintainXClient } from "../lib/client.ts";
import { idParam, organizationIdParam } from "../lib/params.ts";

/**
 * `PATCH /v1/workorders/{id}/status` — the only way to start, hold, complete or
 * cancel a work order. The accepted set is narrower than the one the list
 * filter returns: `SKIPPED` can be read but not set.
 */
interface Input {
  workOrderId: number;
  status: string;
  organizationId?: number;
}

const workorderStatusSet: ActionDefinition<Input> = {
  key: "workorder-status-set",
  type: "perform",
  resource: "workorder",
  title: "Set Work Order Status",
  description: "Move a work order to OPEN, IN_PROGRESS, ON_HOLD, DONE or CANCELED.",
  idempotent: true,
  params: [
    idParam("workOrderId", "Work order ID"),
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: ["OPEN", "IN_PROGRESS", "ON_HOLD", "DONE", "CANCELED"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    organizationIdParam,
  ],
  output: [{ key: "data", type: "object", label: "The updated work order" }],

  execute(input, ctx) {
    return new MaintainXClient(ctx).entity(
      `/workorders/${encodeId(input.workOrderId)}/status`,
      "workOrder",
      {
        method: "PATCH",
        body: { status: input.status },
        organizationId: input.organizationId,
      },
    );
  },
};

export default workorderStatusSet;
