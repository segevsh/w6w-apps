import type { ActionDefinition } from "@w6w/types";
import { compact, StreamtimeClient } from "../lib/client.ts";
import { asOptionalJson, dateParam, modelObjectParam, optionalIdParam } from "../lib/params.ts";

/**
 * `POST /logged_times` — log one time entry.
 *
 * ## Two shapes of "what this time belongs to"
 *
 * A time entry attaches to a job **or** to a `jobItemUserId`. The second is the
 * one that puts the hours against a person's schedule on a job item, which is
 * what makes logged time roll up into the job item's `totalLoggedMinutes` and
 * into the schedule's completed work — so pass `jobItemUserId` when the time
 * belongs to scheduled work and `jobId` when it does not.
 *
 * `completedDatetime`, `scheduleNotes`, `cost`, `totalCostExTax` and
 * `totalExTax` are read-only: they are what the rate cards and the job item make
 * of the entry.
 *
 * For many entries at once use `logged-times-create-bulk`.
 */
interface Input {
  minutes: number;
  date: string;
  userId?: number;
  loggedTimeStatus?: unknown;
  jobId?: number;
  jobItemUserId?: number;
  notes?: string;
  private?: boolean;
}

const loggedTimeCreate: ActionDefinition<Input> = {
  key: "logged-time-create",
  type: "perform",
  resource: "logged-time",
  title: "Create Logged Time",
  description:
    "Log a single time entry against a job or a job-item user, with its date, minutes and notes.",
  idempotent: false,
  params: [
    {
      key: "minutes",
      label: "Minutes",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "The unit is minutes — a full day is not 8.",
    },
    dateParam("date", "Date", "The day the time was worked."),
    optionalIdParam("userId", "User ID", "Whose time it is. Defaults to the token's own user."),
    modelObjectParam("loggedTimeStatus", "Status", '{ "id": 1, "name": "Incomplete" }'),
    optionalIdParam("jobId", "Job ID", "Use this when the time is not against a scheduled item."),
    optionalIdParam(
      "jobItemUserId",
      "Job Item User ID",
      "Use this to log against a schedule entry.",
    ),
    { key: "notes", label: "Notes", type: "text" },
    {
      key: "private",
      label: "Private",
      type: "boolean",
      default: false,
      hint: "The schema types this as always present; Streamtime's own example sends false.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "New logged time ID" },
    { key: "date", type: "string", label: "Date" },
    { key: "minutes", type: "number", label: "Minutes" },
    { key: "jobId", type: "number", label: "Job ID" },
    { key: "jobItemUserId", type: "number", label: "Job item user ID" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request("/logged_times", {
      method: "POST",
      body: compact({
        minutes: input.minutes,
        date: input.date,
        userId: input.userId,
        loggedTimeStatus: asOptionalJson(input.loggedTimeStatus, "loggedTimeStatus"),
        jobId: input.jobId,
        jobItemUserId: input.jobItemUserId,
        notes: input.notes,
        private: input.private,
      }),
    });
  },
};

export default loggedTimeCreate;
