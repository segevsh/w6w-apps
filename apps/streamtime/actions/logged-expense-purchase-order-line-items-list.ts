import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /logged_expenses/{logged_expense_id}/purchase_order_line_items` — the
 * purchase order's lines.
 *
 * "Returns purchase order line items if the logged expense is a purchase order;
 * otherwise returns an **empty list**" — the opposite of the sibling route,
 * which answers `null`. An empty array here is a successful answer.
 */
interface Input {
  loggedExpenseId: number;
}

const loggedExpensePurchaseOrderLineItemsList: ActionDefinition<Input> = {
  key: "logged-expense-purchase-order-line-items-list",
  type: "search",
  resource: "logged-expense",
  title: "List Purchase Order Line Items",
  description:
    "List the line items of a logged expense's purchase order. An empty list means the expense " +
    "is not a purchase order.",
  params: [idParam("loggedExpenseId", "Logged Expense ID")],
  output: [
    {
      key: "purchaseOrderLineItems",
      type: "array",
      label: "Line items — `{ id, name, quantity, unitRate, taxName, … }`",
    },
  ],

  async execute(input, ctx) {
    const purchaseOrderLineItems = await new StreamtimeClient(ctx).request<unknown[]>(
      `/logged_expenses/${encodeId(input.loggedExpenseId)}/purchase_order_line_items`,
    );
    return { purchaseOrderLineItems: purchaseOrderLineItems ?? [] };
  },
};

export default loggedExpensePurchaseOrderLineItemsList;
