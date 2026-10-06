import type { ActionDefinition } from "@w6w/types";
import { compact, dateText, objectList, requiredText, runJob } from "../lib/client.ts";

interface Input {
  transactionList: unknown;
  employeeEmail?: string;
}

/** `create` / `expenses` — the Expense creator. */
const createExpenses: ActionDefinition<Input> = {
  key: "create-expenses",
  type: "perform",
  resource: "expense",
  title: "Create Expenses",
  description:
    "Create expenses in the connected account (or, with advanced permissions, another employee's). Each expense needs merchant, created date, amount in cents and a currency.",
  idempotent: false,
  params: [
    {
      key: "transactionList",
      label: "Expenses",
      type: "json",
      required: true,
      hint:
        'JSON array. Each: {"merchant","created":"yyyy-mm-dd","amount":1234 (cents),"currency":"USD"} plus optional externalID, category, tag, billable, reimbursable, comment, reportID, policyID, tax:{rateID,amount}. Set externalID so a retry can be recognised in an export — Expensify does not de-duplicate.',
    },
    {
      key: "employeeEmail",
      label: "Employee email",
      type: "string",
      hint:
        "Create the expenses in this account instead. Restricted: needs advanced permissions from Expensify.",
    },
  ],
  output: [
    { key: "transactionList", type: "array", label: "Created expenses, each with a transactionID" },
    { key: "count", type: "number", label: "Number of expenses created" },
  ],

  async execute(input, ctx) {
    const list = objectList("transactionList", input.transactionList);
    list.forEach((e, i) => {
      for (const f of ["merchant", "currency"]) requiredText(`transactionList[${i}].${f}`, e[f]);
      dateText(`transactionList[${i}].created`, e.created, true);
      if (!Number.isInteger(e.amount)) {
        throw new Error(`transactionList[${i}].amount must be an integer number of cents`);
      }
    });
    const res = await runJob(ctx, {
      type: "create",
      inputSettings: compact({
        type: "expenses",
        employeeEmail: input.employeeEmail,
        transactionList: list,
      }),
    });
    const created = (res.transactionList as unknown[] | undefined) ?? [];
    return { transactionList: created, count: created.length };
  },
};

export default createExpenses;
