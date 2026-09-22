import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /job_items/{job_item_id}` — one job item and its roll-ups. */
interface Input {
  jobItemId: number;
}

const jobItemGet: ActionDefinition<Input> = {
  key: "job-item-get",
  type: "read",
  resource: "job-item",
  title: "Get Job Item",
  description:
    "Fetch one job item by id — phase, status, rates, planned/incomplete/logged minutes and its " +
    "sub-item counts.",
  params: [idParam("jobItemId", "Job Item ID")],
  output: [
    { key: "id", type: "number", label: "Job item ID" },
    { key: "jobId", type: "number", label: "Job ID" },
    { key: "jobPhaseId", type: "number", label: "Phase ID" },
    { key: "name", type: "string", label: "Item name" },
    { key: "jobItemStatus", type: "object", label: "Status — `{ id, name }`" },
    { key: "sellRate", type: "number", label: "Sell rate" },
    { key: "jobCurrencySellRate", type: "number", label: "Sell rate in job currency" },
    { key: "totalPlannedMinutes", type: "number", label: "Planned minutes" },
    { key: "totalIncompleteMinutes", type: "number", label: "Incomplete minutes" },
    { key: "totalLoggedMinutes", type: "number", label: "Logged minutes" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/job_items/${encodeId(input.jobItemId)}`);
  },
};

export default jobItemGet;
