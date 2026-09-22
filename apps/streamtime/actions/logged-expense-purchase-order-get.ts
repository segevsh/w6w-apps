import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /logged_expenses/{logged_expense_id}/purchase_order` — the purchase order
 * behind a logged expense.
 *
 * "Returns the purchase order details **if the logged expense is a purchase
 * order; otherwise returns null**", per the vendor. So a `null` result is a
 * normal, successful answer — the expense exists and simply is not a purchase
 * order. Both amounts on the model are read-only: paid, total tax, total inc
 * tax in the expense's currency and in the job's.
 */
interface Input {
  loggedExpenseId: number;
}

const loggedExpensePurchaseOrderGet: ActionDefinition<Input> = {
  key: "logged-expense-purchase-order-get",
  type: "read",
  resource: "logged-expense",
  title: "Get Logged Expense Purchase Order",
  description:
    "Fetch the purchase order for a logged expense. Returns null when the expense is not a " +
    "purchase order — that is a successful answer, not an error.",
  params: [idParam("loggedExpenseId", "Logged Expense ID")],
  output: [
    { key: "id", type: "number", label: "Purchase order ID" },
    { key: "number", type: "string", label: "Purchase order number" },
    { key: "sentByUserId", type: "number", label: "Sent by" },
    { key: "sentDatetime", type: "string", label: "Sent at" },
    { key: "requiredDate", type: "string", label: "Required date" },
    { key: "paidDate", type: "string", label: "Paid date" },
    {
      key: "loggedExpenseCurrencyTotalAmountIncTax",
      type: "number",
      label: "Total inc tax, expense currency",
    },
    { key: "jobCurrencyTotalAmountIncTax", type: "number", label: "Total inc tax, job currency" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(
      `/logged_expenses/${encodeId(input.loggedExpenseId)}/purchase_order`,
    );
  },
};

export default loggedExpensePurchaseOrderGet;
