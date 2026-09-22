import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /logged_expenses/{logged_expense_id}` — one logged expense.
 *
 * `loggedExpenseStatus` is a **string** on this model while
 * `loggedExpenseStatusId` is the id — the only place in the API where both are
 * present, and the reason `logged-expense-update` writes the id.
 */
interface Input {
  loggedExpenseId: number;
}

const loggedExpenseGet: ActionDefinition<Input> = {
  key: "logged-expense-get",
  type: "read",
  resource: "logged-expense",
  title: "Get Logged Expense",
  description: "Fetch one logged expense by id.",
  params: [
    idParam("loggedExpenseId", "Logged Expense ID", "Ids come from a search over `expenses`."),
  ],
  output: [
    { key: "id", type: "number", label: "Logged expense ID" },
    { key: "jobId", type: "number", label: "Job ID" },
    { key: "jobPhaseId", type: "number", label: "Phase ID" },
    { key: "itemName", type: "string", label: "Item name" },
    { key: "type", type: "string", label: "`Expense` or `Purchase Order`" },
    { key: "loggedExpenseStatus", type: "string", label: "Status name" },
    { key: "costRate", type: "number", label: "Cost rate" },
    { key: "sellRate", type: "number", label: "Sell rate" },
    { key: "quantity", type: "number", label: "Quantity" },
    { key: "jobCurrencyTotalExTax", type: "number", label: "Total ex tax, job currency" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/logged_expenses/${encodeId(input.loggedExpenseId)}`);
  },
};

export default loggedExpenseGet;
