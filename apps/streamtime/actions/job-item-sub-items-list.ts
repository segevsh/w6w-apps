import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /job_items/{job_item_id}/job_item_sub_items` — the checklist under an
 * item.
 *
 * A sub-item is a single line of work: a `description`, a status, an optional
 * `orderId`, and — when it has been completed — `completedDatetime` and
 * `completedByUserId`. Those two are read-only, which is what makes sub-item
 * completion a side effect inside Streamtime rather than something this API can
 * stamp.
 */
interface Input {
  jobItemId: number;
}

const jobItemSubItemsList: ActionDefinition<Input> = {
  key: "job-item-sub-items-list",
  type: "search",
  resource: "job-item-sub-item",
  title: "List Job Item Sub-items",
  description: "List the sub-items of a job item.",
  params: [idParam("jobItemId", "Job Item ID")],
  output: [{ key: "jobItemSubItems", type: "array", label: "Sub-items" }],

  async execute(input, ctx) {
    const jobItemSubItems = await new StreamtimeClient(ctx).request<unknown[]>(
      `/job_items/${encodeId(input.jobItemId)}/job_item_sub_items`,
    );
    return { jobItemSubItems: jobItemSubItems ?? [] };
  },
};

export default jobItemSubItemsList;
