import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /job_item_sub_items/{job_item_sub_item_id}` — one sub-item. */
interface Input {
  jobItemSubItemId: number;
}

const jobItemSubItemGet: ActionDefinition<Input> = {
  key: "job-item-sub-item-get",
  type: "read",
  resource: "job-item-sub-item",
  title: "Get Job Item Sub-item",
  description: "Fetch one job item sub-item by id.",
  params: [idParam("jobItemSubItemId", "Job Item Sub-item ID")],
  output: [
    { key: "id", type: "number", label: "Sub-item ID" },
    { key: "jobItemId", type: "number", label: "Parent job item ID" },
    { key: "description", type: "string", label: "Description" },
    { key: "jobItemSubItemStatus", type: "object", label: "Status — `{ id, name }`" },
    { key: "completedDatetime", type: "string", label: "Completed at — read-only" },
    { key: "completedByUserId", type: "number", label: "Completed by — read-only" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(
      `/job_item_sub_items/${encodeId(input.jobItemSubItemId)}`,
    );
  },
};

export default jobItemSubItemGet;
