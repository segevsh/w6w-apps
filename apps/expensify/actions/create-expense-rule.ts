import type { ActionDefinition } from "@w6w/types";
import { compact, requiredText, runJob } from "../lib/client.ts";

interface Input {
  policyID: string;
  employeeEmail: string;
  tag?: string;
  defaultBillable?: boolean;
}

/** `create` / `expenseRules` — the Expense rules creator. */
const createExpenseRule: ActionDefinition<Input> = {
  key: "create-expense-rule",
  type: "perform",
  resource: "expense-rule",
  title: "Create Expense Rule",
  description:
    "Create an expense rule for a policy member: expenses they create get the given tag and/or billable default.",
  idempotent: false,
  params: [
    { key: "policyID", label: "Policy ID", type: "string", required: true },
    {
      key: "employeeEmail",
      label: "Employee email",
      type: "string",
      required: true,
      hint: "The policy member that receives the rule.",
    },
    { key: "tag", label: "Tag", type: "string", hint: "Tag applied to the employee's expenses." },
    {
      key: "defaultBillable",
      label: "Default billable",
      type: "boolean",
      hint: "Whether the employee's expenses default to billable.",
    },
  ],
  output: [{ key: "response", type: "object", label: "The Integration Server's response" }],

  async execute(input, ctx) {
    const actions = compact({ tag: input.tag, defaultBillable: input.defaultBillable });
    if (Object.keys(actions).length === 0) {
      throw new Error("provide at least one of tag or defaultBillable");
    }
    const response = await runJob(ctx, {
      type: "create",
      inputSettings: {
        type: "expenseRules",
        policyID: requiredText("policyID", input.policyID),
        employeeEmail: requiredText("employeeEmail", input.employeeEmail),
        actions,
      },
    });
    return { response };
  },
};

export default createExpenseRule;
