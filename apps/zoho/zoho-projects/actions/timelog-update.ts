import type { ActionDefinition } from "@w6w/types";
import { compact, enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  logId: string;
  date?: string;
  billStatus?: string;
  logName?: string;
  hours?: string;
  notes?: string;
  ownerZpuid?: string;
  startTime?: string;
  endTime?: string;
}

const timelogUpdate: ActionDefinition<Input> = {
  key: "timelog-update",
  type: "perform",
  resource: "timelog",
  title: "Update Time Log",
  description: "Update a time log's date, hours, billing status, notes or owner.",
  idempotent: true,
  params: [
    portalId,
    projectId,
    {
      key: "logId",
      label: "Time Log ID",
      type: "string",
      required: true,
      hint: "The id of a time log.",
    },
    { key: "date", label: "Date", type: "string", hint: "YYYY-MM-DD." },
    {
      key: "billStatus",
      label: "Billing Status",
      type: "select",
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
      "PATCH",
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/logs/${enc(input.logId)}`,
      {
        body: compact({
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

export default timelogUpdate;
