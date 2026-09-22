import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /job_item_users/{job_item_user_id}` — one person's schedule entry. */
interface Input {
  jobItemUserId: number;
}

const jobItemUserGet: ActionDefinition<Input> = {
  key: "job-item-user-get",
  type: "read",
  resource: "job-item-user",
  title: "Get Job Item User",
  description: "Fetch one job item user (schedule entry) by id.",
  params: [idParam("jobItemUserId", "Job Item User ID")],
  output: [
    { key: "id", type: "number", label: "Schedule entry ID" },
    { key: "jobItemId", type: "number", label: "Job item ID" },
    { key: "userId", type: "number", label: "User ID" },
    { key: "jobItemUserStatus", type: "object", label: "Status — `{ id, name }`" },
    { key: "totalPlannedMinutes", type: "number", label: "Planned minutes" },
    { key: "totalLoggedMinutes", type: "number", label: "Logged minutes" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/job_item_users/${encodeId(input.jobItemUserId)}`);
  },
};

export default jobItemUserGet;
