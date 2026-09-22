import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, StreamtimeClient } from "../lib/client.ts";
import {
  asOptionalJson,
  dateParam,
  idParam,
  modelObjectParam,
  optionalIdParam,
} from "../lib/params.ts";

/**
 * `PUT /logged_times/{logged_time_id}` — correct a time entry.
 *
 * Write the fields you are changing: the read-only ones (`completedDatetime`,
 * `cost`, the totals) are recomputed by Streamtime from the job item's rates.
 */
interface Input {
  loggedTimeId: number;
  minutes?: number;
  date?: string;
  userId?: number;
  loggedTimeStatus?: unknown;
  jobId?: number;
  jobItemUserId?: number;
  notes?: string;
  private?: boolean;
}

const loggedTimeUpdate: ActionDefinition<Input> = {
  key: "logged-time-update",
  type: "perform",
  resource: "logged-time",
  title: "Update Logged Time",
  description: "Update a time entry's minutes, date, status, notes or attachments.",
  idempotent: true,
  params: [
    idParam("loggedTimeId", "Logged Time ID"),
    {
      key: "minutes",
      label: "Minutes",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    dateParam("date", "Date"),
    optionalIdParam("userId", "User ID"),
    modelObjectParam("loggedTimeStatus", "Status", '{ "id": 1, "name": "Complete" }'),
    optionalIdParam("jobId", "Job ID"),
    optionalIdParam("jobItemUserId", "Job Item User ID"),
    { key: "notes", label: "Notes", type: "text" },
    { key: "private", label: "Private", type: "boolean" },
  ],
  output: [
    { key: "id", type: "number", label: "Logged time ID" },
    { key: "date", type: "string", label: "Date" },
    { key: "minutes", type: "number", label: "Minutes" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/logged_times/${encodeId(input.loggedTimeId)}`, {
      method: "PUT",
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

export default loggedTimeUpdate;
