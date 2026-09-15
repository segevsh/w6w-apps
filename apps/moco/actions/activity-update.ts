import type { ActionDefinition } from "@w6w/types";
import { compact, MocoClient } from "../lib/client.ts";

interface Input {
  activityId: number;
  date?: string;
  projectId?: number;
  taskId?: number;
  hours?: number;
  description?: string;
  tag?: string;
  billable?: boolean;
  stopTimer?: boolean;
}

/**
 * `PATCH /activities/{id}` — verified against `docs.mocoapp.com/api/docs/v1.yaml`, documented
 * as using "the same payload fields as create". `stopTimer` maps to MOCO's own `stop_timer`: if a
 * timer is running on this activity, set it to stop the timer before applying the update —
 * otherwise a running timer keeps its own `seconds` value and this update's `hours` is ignored.
 */
const activityUpdate: ActionDefinition<Input> = {
  key: "activity-update",
  type: "perform",
  resource: "activity",
  title: "Update Activity",
  description: "Update a tracked time entry. Only the fields provided are changed.",
  idempotent: true,
  params: [
    { key: "activityId", label: "Activity ID", type: "number", required: true },
    { key: "date", label: "Date", type: "date", row: "when" },
    { key: "hours", label: "Hours", type: "number", row: "when" },
    { key: "projectId", label: "Project ID", type: "number" },
    { key: "taskId", label: "Task/service ID", type: "number" },
    { key: "description", label: "Description", type: "text" },
    { key: "tag", label: "Tag", type: "string", advanced: true },
    { key: "billable", label: "Billable", type: "boolean", advanced: true },
    {
      key: "stopTimer",
      label: "Stop running timer first",
      type: "boolean",
      advanced: true,
      hint: "Required to change Hours while a timer is running on this activity.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Activity ID" },
    { key: "hours", type: "number", label: "Hours" },
  ],

  execute(input, ctx) {
    return new MocoClient(ctx).request(`/activities/${input.activityId}`, {
      method: "PATCH",
      body: compact({
        date: input.date,
        project_id: input.projectId,
        task_id: input.taskId,
        seconds: input.hours === undefined ? undefined : Math.round(input.hours * 3600),
        description: input.description,
        tag: input.tag,
        billable: input.billable,
        stop_timer: input.stopTimer,
      }),
    });
  },
};

export default activityUpdate;
