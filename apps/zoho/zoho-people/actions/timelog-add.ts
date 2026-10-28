import type { ActionDefinition } from "@w6w/types";
import { API, peopleCall } from "../lib/people.ts";

interface Input {
  user: string;
  jobId: string;
  workDate: string;
  hours?: string;
  fromTime?: string;
  toTime?: string;
  billingStatus?: string;
  workItem?: string;
  description?: string;
  dateFormat?: string;
}

const timelogAdd: ActionDefinition<Input> = {
  key: "timelog-add",
  type: "perform",
  resource: "timesheet",
  title: "Add Time Log",
  description:
    "Add a time log against a job. Give either `hours` or both `fromTime` and `toTime`. Zoho refuses weekends/holidays/leave, future or too-old dates, and >24h/day depending on the account's time-tracker settings.",
  idempotent: false,
  params: [
    {
      key: "user",
      label: "User",
      type: "string",
      required: true,
      hint: "erecno, email or Employee ID.",
    },
    {
      key: "jobId",
      label: "Job ID",
      type: "string",
      required: true,
      hint: "From List Time Tracker Jobs.",
    },
    {
      key: "workDate",
      label: "Work date",
      type: "string",
      required: true,
      placeholder: "2026-09-15",
      hint: "yyyy-MM-dd, or the company format if `dateFormat` is set.",
    },
    {
      key: "hours",
      label: "Hours",
      type: "string",
      hint: "Decimal (2.5) or time (2:30).",
    },
    { key: "fromTime", label: "From time", type: "string", hint: "2:30PM or 14:30" },
    { key: "toTime", label: "To time", type: "string", hint: "2:30PM or 14:30" },
    {
      key: "billingStatus",
      label: "Billing status",
      type: "select",
      options: [
        { value: "billable", label: "Billable" },
        { value: "non-billable", label: "Non-billable" },
      ],
    },
    { key: "workItem", label: "Work item", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "dateFormat", label: "Date format", type: "string" },
  ],
  output: [
    { key: "timeLogId", type: "string", label: "Id of the new time log" },
    { key: "message", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    for (const k of ["user", "jobId", "workDate"] as const) {
      if (!input[k]) throw new Error(`\`${k}\` is required.`);
    }
    if (!input.hours && !(input.fromTime && input.toTime)) {
      throw new Error("Provide `hours`, or both `fromTime` and `toTime`.");
    }
    const { result, message } = await peopleCall(ctx, `${API}/timetracker/addtimelog`, {
      method: "POST",
      query: {
        user: input.user,
        jobId: input.jobId,
        workDate: input.workDate,
        dateFormat: input.dateFormat,
        hours: input.hours,
        fromTime: input.fromTime,
        toTime: input.toTime,
        billingStatus: input.billingStatus,
        workItem: input.workItem,
        description: input.description,
      },
    });
    const first = (Array.isArray(result) ? result[0] : result) as
      | { timeLogId?: string }
      | undefined;
    return { timeLogId: first?.timeLogId ?? null, message };
  },
};

export default timelogAdd;
