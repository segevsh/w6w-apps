import type { ActionDefinition } from "@w6w/types";
import { compact, requiredText, runJob } from "../lib/client.ts";

interface Input {
  policyID: string;
  employeeEmail: string;
  ruleID: number;
  tag?: string;
  defaultBillable?: boolean;
}

/** `update` / `expenseRules` — the Expense rules updater. */
const updateExpenseRule: ActionDefinition<Input> = {
  key: "update-expense-rule",
  type: "perform",
  resource: "expense-rule",
  title: "Update Expense Rule",
  description: "Update an existing expense rule of a policy member by rule ID.",
  idempotent: true,
  params: [
    { key: "policyID", label: "Policy ID", type: "string", required: true },
    { key: "employeeEmail", label: "Employee email", type: "string", required: true },
    {
      key: "ruleID",
      label: "Rule ID",
      type: "number",
      required: true,
      validation: { min: 0, integer: true },
    },
    { key: "tag", label: "Tag", type: "string" },
    { key: "defaultBillable", label: "Default billable", type: "boolean" },
  ],
  output: [{ key: "response", type: "object", label: "The Integration Server's response" }],

  async execute(input, ctx) {
    if (!Number.isInteger(input.ruleID)) throw new Error("ruleID must be an integer");
    const actions = compact({ tag: input.tag, defaultBillable: input.defaultBillable });
    if (Object.keys(actions).length === 0) {
      throw new Error("provide at least one of tag or defaultBillable");
    }
    const response = await runJob(ctx, {
      type: "update",
      inputSettings: {
        type: "expenseRules",
        policyID: requiredText("policyID", input.policyID),
        employeeEmail: requiredText("employeeEmail", input.employeeEmail),
        ruleID: input.ruleID,
        actions,
      },
    });
    return { response };
  },
};

export default updateExpenseRule;
