import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient } from "../lib/client.ts";

interface Input {
  activityId: string;
}

/**
 * `GET /v3/activities/{activity_id}` — the status of a queued bulk activity.
 *
 * Four actions in this app return an `activity_id` instead of a result, and
 * this is where their outcome actually lands: Import Contacts, Add Contacts to
 * Lists, Remove Contacts from Lists and Delete Contact List.
 *
 * `state` moves `initialized` → `processing` → one of `completed`,
 * `cancelled`, `failed`, `timed_out`. A `201` from the queueing call says
 * nothing about whether the work succeeded; only this does. `percent_done`
 * tracks progress and `activity_errors` carries the per-row failures — an
 * activity can reach `completed` with errors in it, so read both.
 */
const getActivityStatus: ActionDefinition<Input> = {
  key: "get-activity-status",
  type: "read",
  resource: "activity",
  title: "Get Activity Status",
  description:
    "Poll a queued bulk activity. `completed` can still carry per-row errors — read `activity_errors` too.",
  params: [
    {
      key: "activityId",
      label: "Activity ID",
      type: "string",
      required: true,
      hint: "Returned by Import Contacts, Add/Remove Contacts to Lists and Delete Contact List.",
    },
  ],
  output: [
    { key: "activity_id", type: "string", label: "Activity ID" },
    { key: "state", type: "string", label: "State" },
    { key: "percent_done", type: "number", label: "Percent done" },
    { key: "activity_errors", type: "array", label: "Per-row errors" },
    { key: "status", type: "object", label: "Counters" },
  ],

  execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    return client.request(`/activities/${encodeURIComponent(input.activityId)}`);
  },
};

export default getActivityStatus;
