import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, StreamtimeClient } from "../lib/client.ts";
import { asOptionalJson, idParam, modelObjectParam } from "../lib/params.ts";

/**
 * `PUT /job_item_sub_items/{job_item_sub_item_id}` — update a sub-item.
 *
 * Setting `jobItemSubItemStatus` is how the API changes whether a sub-item is
 * complete; `completedDatetime` and `completedByUserId` are read-only stamps
 * Streamtime fills in itself.
 */
interface Input {
  jobItemSubItemId: number;
  description?: string;
  jobItemSubItemStatus?: unknown;
  orderId?: number;
}

const jobItemSubItemUpdate: ActionDefinition<Input> = {
  key: "job-item-sub-item-update",
  type: "perform",
  resource: "job-item-sub-item",
  title: "Update Job Item Sub-item",
  description: "Update a sub-item's description, status or order.",
  idempotent: true,
  params: [
    idParam("jobItemSubItemId", "Job Item Sub-item ID"),
    { key: "description", label: "Description", type: "string" },
    modelObjectParam("jobItemSubItemStatus", "Status", '{ "id": 1, "name": "Complete" }'),
    {
      key: "orderId",
      label: "Order",
      type: "number",
      validation: { integer: true, min: 0 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Sub-item ID" },
    { key: "description", type: "string", label: "Description" },
    { key: "jobItemSubItemStatus", type: "object", label: "Status — `{ id, name }`" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(
      `/job_item_sub_items/${encodeId(input.jobItemSubItemId)}`,
      {
        method: "PUT",
        body: compact({
          description: input.description,
          jobItemSubItemStatus: asOptionalJson(input.jobItemSubItemStatus, "jobItemSubItemStatus"),
          orderId: input.orderId,
        }),
      },
    );
  },
};

export default jobItemSubItemUpdate;
