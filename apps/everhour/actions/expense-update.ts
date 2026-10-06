import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient, toNumberList } from "../lib/client.ts";

/**
 * `PUT /expenses/{expenseId}` — Update an expense.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  expenseId: number;
  category: number;
  date: string;
  amount?: number;
  billable?: boolean;
  details?: string;
  project?: string;
  quantity?: number;
  user?: number;
  attachments?: number[] | string;
}

const expenseUpdate: ActionDefinition<Input> = {
  key: "expense-update",
  type: "perform",
  resource: "expense",
  title: "Update Expense",
  description: "Update an expense.",
  idempotent: true,
  params: [
    {
      key: "expenseId",
      label: "Expense ID",
      type: "number",
      required: true,
      hint: "Numeric expense id (from List Expenses).",
    },
    {
      key: "category",
      label: "Category ID",
      type: "number",
      required: true,
      hint: "Expense category id (from List Expense Categories).",
    },
    { key: "date", label: "Date", type: "date", required: true, hint: "Expense date, YYYY-MM-DD." },
    { key: "amount", label: "Amount", type: "number", hint: "Amount in cents." },
    { key: "billable", label: "Billable", type: "boolean" },
    { key: "details", label: "Details", type: "text" },
    { key: "project", label: "Project ID", type: "string", hint: "e.g. `as:333045610521453`." },
    {
      key: "quantity",
      label: "Quantity",
      type: "number",
      hint: "For unit-based categories (miles, hours, ...).",
    },
    {
      key: "user",
      label: "User ID",
      type: "number",
      hint: "Numeric user id; defaults to the key's owner.",
    },
    {
      key: "attachments",
      label: "Attachment IDs",
      type: "string",
      hint: "Comma-separated ids from Create Attachment.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Expense ID" },
    { key: "amount", type: "number", label: "Amount in cents" },
    { key: "category", type: "number", label: "Category ID" },
    { key: "date", type: "string", label: "Date" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/expenses/${encodeId(input.expenseId)}`, {
      method: "PUT",
      body: compact({
        amount: input.amount,
        billable: input.billable,
        category: input.category,
        date: input.date,
        details: input.details,
        project: input.project,
        quantity: input.quantity,
        user: input.user,
        attachments: toNumberList(input.attachments),
      }),
    });
  },
};

export default expenseUpdate;
