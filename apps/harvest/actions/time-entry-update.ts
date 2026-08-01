import type { ActionDefinition } from "@w6w/types";
import { HarvestClient } from "../lib/client.ts";

interface Input {
  timeEntryId: string;
  projectId?: string;
  taskId?: string;
  spentDate?: string;
  startedTime?: string;
  endedTime?: string;
  hours?: number;
  notes?: string;
}

/**
 * PATCH /time_entries/{id} — update an existing time entry. Only the fields
 * supplied are changed; the request returns the full updated entry.
 */
const timeEntryUpdate: ActionDefinition<Input> = {
  key: "time-entry-update",
  type: "perform",
  resource: "time-entry",
  title: "Update Time Entry",
  description: "Update the fields of an existing time entry.",
  idempotent: false,
  params: [
    { key: "timeEntryId", label: "Time Entry ID", type: "string", required: true },
    { key: "projectId", label: "Project ID", type: "string" },
    { key: "taskId", label: "Task ID", type: "string" },
    { key: "spentDate", label: "Spent date", type: "date" },
    { key: "startedTime", label: "Started time", type: "string", placeholder: "8:00am" },
    { key: "endedTime", label: "Ended time", type: "string", placeholder: "5:00pm" },
    { key: "hours", label: "Hours", type: "number" },
    { key: "notes", label: "Notes", type: "text", config: { multiline: true } },
  ],
  output: [
    { key: "id", type: "number", label: "Time Entry ID" },
    { key: "hours", type: "number", label: "Hours" },
  ],

  execute(input, ctx) {
    const client = new HarvestClient(ctx);
    const body: Record<string, unknown> = {};
    if (input.projectId !== undefined) body.project_id = input.projectId;
    if (input.taskId !== undefined) body.task_id = input.taskId;
    if (input.spentDate !== undefined) body.spent_date = input.spentDate;
    if (input.startedTime !== undefined) body.started_time = input.startedTime;
    if (input.endedTime !== undefined) body.ended_time = input.endedTime;
    if (input.hours !== undefined) body.hours = input.hours;
    if (input.notes !== undefined) body.notes = input.notes;

    return client.request(`/time_entries/${encodeURIComponent(input.timeEntryId)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default timeEntryUpdate;
