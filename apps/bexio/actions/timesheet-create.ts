import type { ActionDefinition } from "@w6w/types";
import { BexioClient } from "../lib/client.ts";

interface Input {
  userId: number;
  clientServiceId: number;
  allowableBill: boolean;
  tracking: Record<string, unknown>;
  text?: string;
  contactId?: number;
  projectId?: number;
}

/**
 * `tracking` is a discriminated union bexio calls two ways: submit either
 * `{"type":"duration","date":"2026-09-15","duration":"01:40"}` or
 * `{"type":"range","start":"2026-09-15 09:00:00","end":"2026-09-15 10:40:00"}`.
 * Modeling both as one JSON field rather than four separate params keeps the
 * form honest about the fact that a caller must pick exactly one shape.
 */
const timesheetCreate: ActionDefinition<Input> = {
  key: "timesheet-create",
  type: "perform",
  resource: "timesheet",
  title: "Create Timesheet",
  description: "Log a tracked time entry against a business activity, project, or contact.",
  idempotent: false,
  params: [
    { key: "userId", label: "User ID", type: "number", required: true },
    {
      key: "clientServiceId",
      label: "Business activity ID",
      type: "number",
      required: true,
      hint: "References a client_service (business activity) object.",
    },
    { key: "allowableBill", label: "Billable", type: "boolean", required: true },
    {
      key: "tracking",
      label: "Time tracked",
      type: "json",
      required: true,
      hint: 'Either `{"type":"duration","date":"2026-09-15","duration":"01:40"}` or ' +
        '`{"type":"range","start":"2026-09-15 09:00:00","end":"2026-09-15 10:40:00"}`.',
    },
    { key: "text", label: "Description", type: "text" },
    { key: "contactId", label: "Contact ID", type: "number" },
    { key: "projectId", label: "Project ID", type: "number" },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "duration", type: "string", label: "Duration" },
  ],

  execute(input, ctx) {
    return new BexioClient(ctx).post("/2.0/timesheet", {
      user_id: input.userId,
      client_service_id: input.clientServiceId,
      allowable_bill: input.allowableBill,
      tracking: input.tracking,
      text: input.text,
      contact_id: input.contactId,
      pr_project_id: input.projectId,
    });
  },
};

export default timesheetCreate;
