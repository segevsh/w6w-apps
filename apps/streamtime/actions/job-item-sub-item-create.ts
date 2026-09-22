import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, StreamtimeClient } from "../lib/client.ts";
import { asOptionalJson, idParam, modelObjectParam } from "../lib/params.ts";

/**
 * `POST /job_items/{job_item_id}/job_item_sub_items` — add a checklist line.
 *
 * `description` is the only mandatory-looking field in the model (it is the one
 * non-nullable string). Completion is read-only, so a new sub-item arrives
 * incomplete and is ticked off inside Streamtime.
 */
interface Input {
  jobItemId: number;
  description: string;
  jobItemSubItemStatus?: unknown;
  orderId?: number;
}

const jobItemSubItemCreate: ActionDefinition<Input> = {
  key: "job-item-sub-item-create",
  type: "perform",
  resource: "job-item-sub-item",
  title: "Create Job Item Sub-item",
  description: "Add a sub-item to a job item.",
  idempotent: false,
  params: [
    idParam("jobItemId", "Job Item ID"),
    {
      key: "description",
      label: "Description",
      type: "string",
      required: true,
      placeholder: "Prepare wireframes",
    },
    modelObjectParam("jobItemSubItemStatus", "Status", '{ "id": 1, "name": "Incomplete" }'),
    {
      key: "orderId",
      label: "Order",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Order index within the item.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "New sub-item ID" },
    { key: "description", type: "string", label: "Sub-item description" },
    { key: "jobItemId", type: "number", label: "Parent job item ID" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(
      `/job_items/${encodeId(input.jobItemId)}/job_item_sub_items`,
      {
        method: "POST",
        body: compact({
          description: input.description,
          jobItemSubItemStatus: asOptionalJson(
            input.jobItemSubItemStatus,
            "jobItemSubItemStatus",
          ),
          orderId: input.orderId,
        }),
      },
    );
  },
};

export default jobItemSubItemCreate;
