import type { ActionDefinition } from "@w6w/types";
import { encodeId, HibobClient } from "../lib/client.ts";
import { employeeIdParam, requireDate, requireString } from "../lib/params.ts";

interface Input {
  employeeId: string;
  policyType: string;
  date: string;
}

/** `GET /v1/timeoff/employees/{id}/balance` — an employee's balance for one policy type as of a date. */
const timeoffBalanceGet: ActionDefinition<Input> = {
  key: "timeoff-balance-get",
  type: "read",
  resource: "timeoff",
  title: "Get Time Off Balance",
  description: "Read an employee's time off balance for a policy type as of a date.",
  params: [
    employeeIdParam,
    {
      key: "policyType",
      label: "Policy type",
      type: "string",
      required: true,
      hint: "Policy type name, e.g. Holiday. See List Time Off Policy Types.",
    },
    { key: "date", label: "As of date", type: "date", required: true },
  ],
  output: [
    { key: "employeeId", type: "string", label: "Employee ID" },
    { key: "totalBalanceAsOfDate", type: "number", label: "Balance as of the date" },
    { key: "totalRoundedBalanceAsOfDate", type: "number", label: "Rounded balance" },
    { key: "totalTaken", type: "number", label: "Total taken" },
    { key: "annualAllowance", type: "number", label: "Annual allowance" },
    { key: "policy", type: "string", label: "Policy name" },
    { key: "currentAssignment", type: "string", label: "Assigned | Unassigned" },
  ],

  async execute(input, ctx) {
    return await new HibobClient(ctx).get(
      `/timeoff/employees/${encodeId(input.employeeId)}/balance`,
      {
        policyType: requireString(input.policyType, "policyType"),
        date: requireDate(input.date, "date"),
      },
    );
  },
};

export default timeoffBalanceGet;
