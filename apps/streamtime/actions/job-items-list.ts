import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /jobs/{job_id}/job_items` — "active job items for a job".
 *
 * The vendor's description says **active**, so an item that was completed and
 * archived away is not in this list; use `search-records` with
 * `search_view: "job_items"` when the question is about items in general.
 *
 * Each returned item carries its own planned/incomplete/logged minutes and the
 * `totalScheduledUsers` / `totalJobItemRoles` counts — the cheapest way to see
 * whether anybody is actually booked onto the work.
 */
interface Input {
  jobId: number;
}

const jobItemsList: ActionDefinition<Input> = {
  key: "job-items-list",
  type: "search",
  resource: "job-item",
  title: "List Job Items",
  description: "List a job's active job items.",
  params: [idParam("jobId", "Job ID")],
  output: [{ key: "jobItems", type: "array", label: "Active job items" }],

  async execute(input, ctx) {
    const jobItems = await new StreamtimeClient(ctx).request<unknown[]>(
      `/jobs/${encodeId(input.jobId)}/job_items`,
    );
    return { jobItems: jobItems ?? [] };
  },
};

export default jobItemsList;
