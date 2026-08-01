import type { ActionDefinition } from "@w6w/types";
import { HarvestClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  taskId: string;
  spentDate: string;
  userId?: string;
  hours?: number;
  startedTime?: string;
  endedTime?: string;
  notes?: string;
}

/**
 * POST /time_entries — create a time entry. Harvest's one endpoint covers
 * three shapes depending on which optional fields are set:
 *
 *   - `hours` set → a duration entry.
 *   - `startedTime` set, `hours` unset → a start/end entry; also set
 *     `endedTime` to close it, or leave it unset to start a **running
 *     timer** (this is how Harvest's "start timer" action works — there is
 *     no separate endpoint for it).
 *   - Neither set → also starts a running timer, defaulting to now.
 *
 * Only one of `hours` / `startedTime` should be provided; Harvest rejects a
 * request that sets both.
 */
const timeEntryCreate: ActionDefinition<Input> = {
  key: "time-entry-create",
  type: "perform",
  resource: "time-entry",
  title: "Create Time Entry",
  description:
    "Create a time entry — by duration, by start/end time, or (omitting both) start a running timer.",
  idempotent: false,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    { key: "taskId", label: "Task ID", type: "string", required: true },
    {
      key: "spentDate",
      label: "Spent date",
      type: "date",
      required: true,
      hint: "The ISO 8601 date the time entry was spent (YYYY-MM-DD).",
    },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      hint: "Defaults to the currently authenticated user.",
    },
    {
      key: "hours",
      label: "Hours",
      type: "number",
      hint: "For a duration entry. Leave blank if using start/end time or starting a timer.",
    },
    {
      key: "startedTime",
      label: "Started time",
      type: "string",
      placeholder: "8:00am",
      hint: "For a start/end entry. Leave both times blank to start a running timer instead.",
    },
    {
      key: "endedTime",
      label: "Ended time",
      type: "string",
      placeholder: "5:00pm",
      hint: "Leave blank (with Started time set) to start a running timer.",
    },
    { key: "notes", label: "Notes", type: "text", config: { multiline: true } },
  ],
  output: [
    { key: "id", type: "number", label: "Time Entry ID" },
    { key: "hours", type: "number", label: "Hours" },
    { key: "is_running", type: "boolean", label: "Is running" },
  ],

  execute(input, ctx) {
    const client = new HarvestClient(ctx);
    const body: Record<string, unknown> = {
      project_id: input.projectId,
      task_id: input.taskId,
      spent_date: input.spentDate,
    };
    if (input.userId !== undefined) body.user_id = input.userId;
    if (input.hours !== undefined) body.hours = input.hours;
    if (input.startedTime !== undefined) body.started_time = input.startedTime;
    if (input.endedTime !== undefined) body.ended_time = input.endedTime;
    if (input.notes !== undefined) body.notes = input.notes;

    return client.request("/time_entries", { method: "POST", body });
  },
};

export default timeEntryCreate;
