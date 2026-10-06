import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, optInt } from "../lib/client.ts";

interface Input {
  usersId?: number | string;
  year?: number | string;
  type?: string;
  status?: string;
  teamsId?: number | string;
  usersActive?: boolean;
}

const listAbsences: ActionDefinition<Input> = {
  key: "list-absences",
  type: "search",
  resource: "absence",
  title: "List Absences",
  description:
    "List absences (GET /v4/absences), filterable by user, year, type, status and team. The documented response is `{ data: [...] }` with no paging block.",
  params: [
    {
      key: "usersId",
      label: "User ID",
      type: "number",
    },
    {
      key: "year",
      label: "Year",
      type: "number",
      hint: "2000-2037.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "1", label: "Holiday from the quota" },
        { value: "2", label: "Special leaves" },
        { value: "3", label: "Reduction of overtime" },
        { value: "4", label: "Sick day" },
        { value: "5", label: "Sick day of a child" },
        { value: "6", label: "School / further education" },
        { value: "7", label: "Maternity protection" },
        { value: "8", label: "Home office" },
        { value: "9", label: "Work out of office" },
        { value: "10", label: "Special leaves (unpaid)" },
        { value: "11", label: "Sick day (unpaid)" },
        { value: "12", label: "Sick day of a child (unpaid)" },
        { value: "13", label: "Quarantine" },
        { value: "14", label: "Military / alternative service" },
        { value: "15", label: "Sick day (sickness benefit)" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "0", label: "Enquired" },
        { value: "1", label: "Approved" },
        { value: "2", label: "Declined" },
        { value: "3", label: "Approval cancelled" },
        { value: "4", label: "Cancelled" },
      ],
    },
    {
      key: "teamsId",
      label: "Team ID",
      type: "number",
    },
    {
      key: "usersActive",
      label: "Active users only",
      type: "boolean",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Absences" },
  ],

  async execute(input, ctx) {
    const body = await new ClockodoClient(ctx).call("/v4/absences", {
      query: {
        filter: {
          users_id: optInt(input.usersId, "usersId"),
          year: optInt(input.year, "year"),
          type: input.type,
          status: input.status,
          teams_id: optInt(input.teamsId, "teamsId"),
          users_active: input.usersActive,
        },
      },
    });
    return { data: Array.isArray(body.data) ? body.data : [] };
  },
};

export default listAbsences;
