import type { ActionDefinition } from "@w6w/types";
import { encodeId, MaintainXClient, toList } from "../lib/client.ts";
import { expandParam, idParam, organizationIdParam } from "../lib/params.ts";

/** `GET /v1/workorders/{id}` — the response wraps the entity as `{ workOrder }`; unwrapped here. */
interface Input {
  workOrderId: number;
  expand?: string;
  organizationId?: number;
}

const workorderGet: ActionDefinition<Input> = {
  key: "workorder-get",
  type: "read",
  resource: "workorder",
  title: "Get Work Order",
  description: "Fetch one work order by id.",
  params: [
    idParam("workOrderId", "Work order ID"),
    expandParam([
      "assignees",
      "asset",
      "location",
      "parts",
      "times",
      "expenditures",
      "extra_fields",
      "estimated_time",
    ]),
    organizationIdParam,
  ],
  output: [{ key: "data", type: "object", label: "The work order" }],

  execute(input, ctx) {
    return new MaintainXClient(ctx).entity(
      `/workorders/${encodeId(input.workOrderId)}`,
      "workOrder",
      {
        query: { expand: toList(input.expand) },
        organizationId: input.organizationId,
      },
    );
  },
};

export default workorderGet;
