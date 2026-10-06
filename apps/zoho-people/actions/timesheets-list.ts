import type { ActionDefinition } from "@w6w/types";
import { peopleGet, requirePositiveLimit } from "../lib/people.ts";
import { limitParam, resultOutput } from "../lib/params.ts";

interface Input {
  user: string;
  approvalStatus?: string;
  employeeStatus?: string;
  fromDate?: string;
  toDate?: string;
  dateFormat?: string;
  sIndex?: number;
  limit?: number;
}

const timesheetsList: ActionDefinition<Input> = {
  key: "timesheets-list",
  type: "read",
  resource: "timesheet",
  title: "List Timesheets",
  description: "List timesheets for a user (or `all`), filtered by approval status and date range.",
  params: [
    {
      key: "user",
      label: "User",
      type: "string",
      required: true,
      hint: "`all`, an email, an Employee ID or an erecno.",
    },
    {
      key: "approvalStatus",
      label: "Approval status",
      type: "select",
      options: [
        { value: "all", label: "All" },
        { value: "draft", label: "Draft" },
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
      ],
    },
    {
      key: "employeeStatus",
      label: "Employee status",
      type: "select",
      options: [
        { value: "users", label: "Users" },
        { value: "nonusers", label: "Non-users" },
        { value: "usersandnonusers", label: "Users and non-users" },
        { value: "logindisabled", label: "Login disabled" },
      ],
    },
    { key: "fromDate", label: "From date", type: "string" },
    { key: "toDate", label: "To date", type: "string" },
    { key: "dateFormat", label: "Date format", type: "string" },
    { key: "sIndex", label: "Start index", type: "number", default: 0, hint: "0-based." },
    limitParam,
  ],
  output: resultOutput,

  async execute(input, ctx) {
    if (!input.user) throw new Error("`user` is required.");
    return await peopleGet(ctx, "/timetracker/gettimesheet", {
      user: input.user,
      approvalStatus: input.approvalStatus,
      employeeStatus: input.employeeStatus,
      fromDate: input.fromDate,
      toDate: input.toDate,
      dateFormat: input.dateFormat,
      sIndex: input.sIndex,
      limit: requirePositiveLimit(input.limit),
    });
  },
};

export default timesheetsList;
