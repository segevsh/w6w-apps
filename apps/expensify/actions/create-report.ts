import type { ActionDefinition } from "@w6w/types";
import { compact, dateText, jsonValue, objectList, requiredText, runJob } from "../lib/client.ts";

interface Input {
  policyID: string;
  title: string;
  expenses: unknown;
  employeeEmail?: string;
  fields?: unknown;
}

/** `create` / `report` — the Report creator. */
const createReport: ActionDefinition<Input> = {
  key: "create-report",
  type: "perform",
  resource: "report",
  title: "Create Report",
  description:
    "Create a report containing expenses in a policy. Domain and policy admin only, and the feature must first be enabled for your domain by concierge@expensify.com (otherwise 'Not authorized to authenticate as user').",
  idempotent: false,
  params: [
    { key: "policyID", label: "Policy ID", type: "string", required: true },
    { key: "title", label: "Report title", type: "string", required: true },
    {
      key: "expenses",
      label: "Expenses",
      type: "json",
      required: true,
      hint:
        'JSON array of {"date":"yyyy-mm-dd","currency":"USD","merchant":"…","amount":1234 (cents)}. Note: this job names the date `date`; Create Expenses names it `created`.',
    },
    {
      key: "employeeEmail",
      label: "Employee email",
      type: "string",
      hint: "The account the report is created in.",
    },
    {
      key: "fields",
      label: "Report fields",
      type: "json",
      hint:
        'Custom report-field values keyed by field name with every non-alphanumeric character replaced by "_", e.g. {"reason_of_trip":"Business trip"}.',
    },
  ],
  output: [
    { key: "reportID", type: "string", label: "ID of the created report" },
    { key: "reportName", type: "string", label: "Name of the created report" },
  ],

  async execute(input, ctx) {
    const policyID = requiredText("policyID", input.policyID);
    const title = requiredText("title", input.title);
    const expenses = objectList("expenses", input.expenses);
    expenses.forEach((e, i) => {
      requiredText(`expenses[${i}].merchant`, e.merchant);
      requiredText(`expenses[${i}].currency`, e.currency);
      dateText(`expenses[${i}].date`, e.date, true);
      if (!Number.isInteger(e.amount)) {
        throw new Error(`expenses[${i}].amount must be an integer number of cents`);
      }
    });
    const fields = input.fields === undefined || input.fields === ""
      ? undefined
      : jsonValue("fields", input.fields);
    const res = await runJob(ctx, {
      type: "create",
      inputSettings: compact({
        type: "report",
        policyID,
        report: compact({ title, fields }),
        employeeEmail: input.employeeEmail,
        expenses,
      }),
    });
    return { reportID: res.reportID, reportName: res.reportName };
  },
};

export default createReport;
