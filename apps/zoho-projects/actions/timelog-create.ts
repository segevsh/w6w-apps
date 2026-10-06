import type { ActionDefinition } from "@w6w/types";
import { compact, enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  moduleType: string;
  moduleId?: string;
  date: string;
  billStatus: string;
  logName?: string;
  hours?: string;
  notes?: string;
  ownerZpuid?: string;
  startTime?: string;
  endTime?: string;
}

const timelogCreate: ActionDefinition<Input> = {
  key: "timelog-create",
  type: "perform",
  resource: "timelog",
  title: "Create Time Log",
  description: "Log time against a task, an issue or the project in general.",
  idempotent: false,
  params: [
    portalId,
    projectId,
    {
      key: "moduleType",
      label: "Logged Against",
      type: "select",
      required: true,
      options: [{ value: "task", label: "Task" }, { value: "issue", label: "Issue" }, {
        value: "general",
        label: "General",
      }],
    },
    {
      key: "moduleId",
      label: "Task or Issue ID",
      type: "string",
      hint: "Required when logging against a task or an issue.",
    },
    { key: "date", label: "Date", type: "string", required: true, hint: "YYYY-MM-DD." },
    {
      key: "billStatus",
      label: "Billing Status",
      type: "select",
      required: true,
      options: [{ value: "Billable", label: "Billable" }, {
        value: "Non Billable",
        label: "Non billable",
      }],
    },
    { key: "logName", label: "Name", type: "string" },
    { key: "hours", label: "Hours", type: "string", hint: "e.g. 01.00 or 1:30." },
    { key: "notes", label: "Notes", type: "text" },
    { key: "ownerZpuid", label: "Owner ZPUID", type: "string" },
    { key: "startTime", label: "Start Time", type: "string", hint: "e.g. 11:59 PM." },
    { key: "endTime", label: "End Time", type: "string", hint: "e.g. 11:59 PM." },
  ],
  output: [{ key: "item", type: "object", label: "Resulting record" }],

  async execute(input, ctx) {
    const body = await new ProjectsClient(ctx).request(
      "POST",
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/log`,
      {
        body: compact({
          module: { type: input.moduleType, id: input.moduleId },
          log_name: input.logName,
          date: input.date,
          bill_status: input.billStatus,
          hours: input.hours,
          notes: input.notes,
          owner_zpuid: input.ownerZpuid,
          start_time: input.startTime,
          end_time: input.endTime,
        }),
      },
    );
    return { item: body };
  },
};

export default timelogCreate;
