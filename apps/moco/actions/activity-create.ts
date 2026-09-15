import type { ActionDefinition } from "@w6w/types";
import { compact, MocoClient } from "../lib/client.ts";

interface Input {
  date: string;
  projectId: number;
  taskId: number;
  hours: number;
  description?: string;
  companyId?: number;
  tag?: string;
  billable?: boolean;
}

/**
 * `POST /activities` — verified against `docs.mocoapp.com/api/docs/v1.yaml`. The OpenAPI
 * schema marks no field required, but a tracked activity is meaningless without a date, a project,
 * a task and a duration, so those four are required here.
 *
 * The wire field is `seconds` (`hours` is documented `deprecated: true`, kept only for backward
 * compatibility) — this action takes hours as a decimal for a friendlier form and converts it to
 * seconds itself, rather than sending the deprecated field.
 *
 * Creates the activity for the API key's own user; MOCO's `X-IMPERSONATE-USER-ID` header (to log
 * time for another user) is not exposed here — it needs *Staff* permission on the credential and
 * is out of scope for a first pass.
 */
const activityCreate: ActionDefinition<Input> = {
  key: "activity-create",
  type: "perform",
  resource: "activity",
  title: "Create Activity",
  description: "Log a tracked time entry against a project and task.",
  idempotent: false,
  params: [
    { key: "date", label: "Date", type: "date", required: true, row: "when" },
    { key: "hours", label: "Hours", type: "number", required: true, row: "when" },
    { key: "projectId", label: "Project ID", type: "number", required: true },
    { key: "taskId", label: "Task/service ID", type: "number", required: true },
    { key: "description", label: "Description", type: "text" },
    { key: "companyId", label: "Company ID", type: "number", advanced: true },
    { key: "tag", label: "Tag", type: "string", advanced: true },
    { key: "billable", label: "Billable", type: "boolean", advanced: true },
  ],
  output: [
    { key: "id", type: "number", label: "Activity ID" },
    { key: "hours", type: "number", label: "Hours" },
  ],

  execute(input, ctx) {
    return new MocoClient(ctx).request("/activities", {
      method: "POST",
      body: compact({
        date: input.date,
        project_id: input.projectId,
        task_id: input.taskId,
        seconds: Math.round(input.hours * 3600),
        description: input.description,
        company_id: input.companyId,
        tag: input.tag,
        billable: input.billable,
      }),
    });
  },
};

export default activityCreate;
