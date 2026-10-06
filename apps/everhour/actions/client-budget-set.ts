import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `PUT /clients/{clientId}/budget` — Set or replace a client's budget.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  clientId: number;
  type: string;
  budget: number;
  period: string;
  appliedFrom?: string;
  disallowOverbudget?: boolean;
  excludeUnbillableTime?: boolean;
  excludeExpenses?: boolean;
  threshold?: number;
}

const clientBudgetSet: ActionDefinition<Input> = {
  key: "client-budget-set",
  type: "perform",
  resource: "client",
  title: "Set Client Budget",
  description: "Set or replace a client's budget.",
  idempotent: true,
  params: [
    {
      key: "clientId",
      label: "Client ID",
      type: "number",
      required: true,
      hint: "Numeric Everhour client id (from List Clients).",
    },
    {
      key: "type",
      label: "Budget type",
      type: "select",
      required: true,
      options: [{ value: "money", label: "money" }, { value: "time", label: "time" }, {
        value: "costs",
        label: "costs",
      }],
      hint: "`money` (cents), `time` (seconds) or `costs` (money, using user hourly cost rates).",
    },
    {
      key: "budget",
      label: "Budget",
      type: "number",
      required: true,
      hint: "Budget value in cents (money, costs) or seconds (time).",
    },
    {
      key: "period",
      label: "Period",
      type: "select",
      required: true,
      options: [{ value: "general", label: "general" }, { value: "monthly", label: "monthly" }, {
        value: "weekly",
        label: "weekly",
      }, { value: "daily", label: "daily" }],
      hint: "Budget periodicity.",
    },
    {
      key: "appliedFrom",
      label: "Applied from",
      type: "date",
      hint: "Start the budget from this date (non-recurrent `general` budgets only).",
    },
    { key: "disallowOverbudget", label: "Disallow overbudget", type: "boolean" },
    { key: "excludeUnbillableTime", label: "Exclude non-billable time", type: "boolean" },
    { key: "excludeExpenses", label: "Exclude expenses", type: "boolean" },
    {
      key: "threshold",
      label: "Alert threshold %",
      type: "number",
      hint: "Email admins when this percentage (1-100) of the budget is reached.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Client ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "projects", type: "array", label: "Project IDs" },
    { key: "budget", type: "object", label: "Budget" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/clients/${encodeId(input.clientId)}/budget`, {
      method: "PUT",
      body: compact({
        type: input.type,
        budget: input.budget,
        period: input.period,
        appliedFrom: input.appliedFrom,
        disallowOverbudget: input.disallowOverbudget,
        excludeUnbillableTime: input.excludeUnbillableTime,
        excludeExpenses: input.excludeExpenses,
        threshold: input.threshold,
      }),
    });
  },
};

export default clientBudgetSet;
