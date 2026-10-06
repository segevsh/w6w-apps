import type { ActionDefinition } from "@w6w/types";
import { peopleGet, requirePositiveLimit } from "../lib/people.ts";
import { limitParam, resultOutput } from "../lib/params.ts";

interface Input {
  user?: string;
  fromDate?: string;
  toDate?: string;
  jobId?: string;
  projectId?: string;
  clientId?: string;
  billingStatus?: string;
  approvalStatus?: string;
  dateFormat?: string;
  sIndex?: number;
  limit?: number;
}

const timelogsList: ActionDefinition<Input> = {
  key: "timelogs-list",
  type: "read",
  resource: "timesheet",
  title: "List Time Logs",
  description:
    "Fetch time logs for a user and date range. The API allows at most one month between fromDate and toDate per call.",
  params: [
    {
      key: "user",
      label: "User",
      type: "string",
      hint: "`all`, an erecno, email or Employee ID. Defaults to the connected user.",
    },
    {
      key: "fromDate",
      label: "From date",
      type: "string",
      placeholder: "2026-09-01",
      hint: "yyyy-MM-dd or the company date format. Defaults to today.",
    },
    { key: "toDate", label: "To date", type: "string", placeholder: "2026-09-30" },
    { key: "jobId", label: "Job ID", type: "string" },
    { key: "projectId", label: "Project ID", type: "string" },
    { key: "clientId", label: "Client ID", type: "string" },
    {
      key: "billingStatus",
      label: "Billing status",
      type: "select",
      options: [
        { value: "all", label: "All" },
        { value: "billable", label: "Billable" },
        { value: "non-billable", label: "Non-billable" },
      ],
    },
    {
      key: "approvalStatus",
      label: "Approval status",
      type: "select",
      options: [
        { value: "all", label: "All" },
        { value: "approved", label: "Approved" },
        { value: "unapproved", label: "Unapproved" },
      ],
    },
    { key: "dateFormat", label: "Date format", type: "string" },
    { key: "sIndex", label: "Start index", type: "number", default: 0, hint: "0-based." },
    limitParam,
  ],
  output: resultOutput,

  async execute(input, ctx) {
    return await peopleGet(ctx, "/timetracker/gettimelogs", {
      user: input.user,
      fromDate: input.fromDate,
      toDate: input.toDate,
      jobId: input.jobId,
      projectId: input.projectId,
      clientId: input.clientId,
      billingStatus: input.billingStatus,
      approvalStatus: input.approvalStatus,
      dateFormat: input.dateFormat,
      sIndex: input.sIndex,
      limit: requirePositiveLimit(input.limit),
    });
  },
};

export default timelogsList;
