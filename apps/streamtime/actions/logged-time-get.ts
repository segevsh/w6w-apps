import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /logged_times/{logged_time_id}` — one time entry. */
interface Input {
  loggedTimeId: number;
}

const loggedTimeGet: ActionDefinition<Input> = {
  key: "logged-time-get",
  type: "read",
  resource: "logged-time",
  title: "Get Logged Time",
  description: "Fetch one logged time entry by id.",
  params: [idParam("loggedTimeId", "Logged Time ID", "Ids come from a search over `time`.")],
  output: [
    { key: "id", type: "number", label: "Logged time ID" },
    { key: "date", type: "string", label: "Date" },
    { key: "minutes", type: "number", label: "Minutes" },
    { key: "jobId", type: "number", label: "Job ID" },
    { key: "jobItemUserId", type: "number", label: "Job item user ID" },
    { key: "loggedTimeStatus", type: "object", label: "Status — `{ id, name }`" },
    { key: "notes", type: "string", label: "Notes" },
    { key: "private", type: "boolean", label: "Private" },
    { key: "totalExTax", type: "number", label: "Sell total ex tax" },
    { key: "totalCostExTax", type: "number", label: "Cost total ex tax" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/logged_times/${encodeId(input.loggedTimeId)}`);
  },
};

export default loggedTimeGet;
