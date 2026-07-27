import type { ActionDefinition } from "@w6w/types";
import { compact, PipedriveClient } from "../lib/client.ts";

interface Input {
  subject: string;
  type: string;
  dueDate?: string;
  dueTime?: string;
  duration?: string;
  dealId?: number;
  personId?: number;
  orgId?: number;
  note?: string;
  done?: boolean;
  userId?: number;
}

/**
 * POST /activities — create an activity (call, meeting, task, …). Pipedrive
 * requires both a `subject` and a `type` (the activity-type key, e.g. `call`,
 * `meeting`, `task`). `done` is a 0/1 flag on the wire, so a boolean is coerced.
 */
const activityCreate: ActionDefinition<Input> = {
  key: "activity-create",
  type: "perform",
  resource: "activity",
  title: "Create Activity",
  description: "Create a new activity and optionally link it to a deal, person or organization.",
  idempotent: false,
  params: [
    { key: "subject", label: "Subject", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "string",
      required: true,
      hint: "Activity-type key, e.g. `call`, `meeting`, `task`, `email`.",
    },
    { key: "dueDate", label: "Due date", type: "date", hint: "YYYY-MM-DD." },
    { key: "dueTime", label: "Due time", type: "string", hint: "HH:MM." },
    { key: "duration", label: "Duration", type: "string", hint: "HH:MM." },
    { key: "dealId", label: "Deal ID", type: "number" },
    { key: "personId", label: "Person ID", type: "number" },
    { key: "orgId", label: "Organization ID", type: "number" },
    { key: "note", label: "Note", type: "text" },
    { key: "done", label: "Done", type: "boolean", default: false },
    { key: "userId", label: "Owner (user ID)", type: "number" },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "data", type: "object", label: "Activity" },
  ],

  execute(input, ctx) {
    const client = new PipedriveClient(ctx);
    return client.request("/activities", {
      method: "POST",
      body: compact({
        subject: input.subject,
        type: input.type,
        due_date: input.dueDate,
        due_time: input.dueTime,
        duration: input.duration,
        deal_id: input.dealId,
        person_id: input.personId,
        org_id: input.orgId,
        note: input.note,
        done: input.done === undefined ? undefined : input.done ? 1 : 0,
        user_id: input.userId,
      }),
    });
  },
};

export default activityCreate;
