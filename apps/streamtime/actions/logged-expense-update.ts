import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, StreamtimeClient } from "../lib/client.ts";
import { dateParam, idParam, optionalIdParam } from "../lib/params.ts";

/**
 * `PUT /logged_expenses/{logged_expense_id}` — update a logged expense.
 *
 * The body is the **bare `LoggedExpense` model** here, unlike the create route,
 * which nests it under `loggedExpense`. The vendor's description adds "including
 * status and purchase order details when applicable".
 *
 * `purchaseOrderId` is read-only — a purchase order is the result of Streamtime's
 * own flow, not something a caller attaches.
 */
interface Input {
  loggedExpenseId: number;
  itemName?: string;
  loggedExpenseStatusId?: number;
  date?: string;
  requiredDate?: string;
  purchaseOrderNumber?: string;
  jobId?: number;
  jobPhaseId?: number;
  itemPricingMethodId?: number;
  supplierCompanyId?: number;
  supplierContactId?: number;
  description?: string;
  reference?: string;
  costRate?: number;
  sellRate?: number;
  quantity?: number;
  currencyCode?: string;
  exchangeRate?: number;
  markup?: number;
}

const loggedExpenseUpdate: ActionDefinition<Input> = {
  key: "logged-expense-update",
  type: "perform",
  resource: "logged-expense",
  title: "Update Logged Expense",
  description:
    "Update a logged expense — status, dates, supplier, pricing method, rates or markup.",
  idempotent: true,
  params: [
    idParam("loggedExpenseId", "Logged Expense ID"),
    { key: "itemName", label: "Item Name", type: "string" },
    optionalIdParam("loggedExpenseStatusId", "Status ID"),
    dateParam("date", "Date"),
    dateParam("requiredDate", "Required Date"),
    { key: "purchaseOrderNumber", label: "Purchase Order Number", type: "string" },
    optionalIdParam("jobId", "Job ID"),
    optionalIdParam("jobPhaseId", "Phase ID"),
    optionalIdParam("itemPricingMethodId", "Pricing Method ID"),
    optionalIdParam("supplierCompanyId", "Supplier Company ID"),
    optionalIdParam("supplierContactId", "Supplier Contact ID"),
    { key: "description", label: "Description", type: "text" },
    { key: "reference", label: "Reference", type: "string" },
    { key: "costRate", label: "Cost Rate", type: "number" },
    { key: "sellRate", label: "Sell Rate", type: "number" },
    { key: "quantity", label: "Quantity", type: "number" },
    { key: "currencyCode", label: "Currency Code", type: "string" },
    { key: "exchangeRate", label: "Exchange Rate", type: "number" },
    { key: "markup", label: "Markup %", type: "number", validation: { min: 0, max: 100 } },
  ],
  output: [
    { key: "id", type: "number", label: "Logged expense ID" },
    { key: "itemName", type: "string", label: "Item name" },
    { key: "loggedExpenseStatus", type: "string", label: "Status name" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(
      `/logged_expenses/${encodeId(input.loggedExpenseId)}`,
      {
        method: "PUT",
        body: compact({
          itemName: input.itemName,
          loggedExpenseStatusId: input.loggedExpenseStatusId,
          date: input.date,
          requiredDate: input.requiredDate,
          purchaseOrderNumber: input.purchaseOrderNumber,
          jobId: input.jobId,
          jobPhaseId: input.jobPhaseId,
          itemPricingMethodId: input.itemPricingMethodId,
          supplierCompanyId: input.supplierCompanyId,
          supplierContactId: input.supplierContactId,
          description: input.description,
          reference: input.reference,
          costRate: input.costRate,
          sellRate: input.sellRate,
          quantity: input.quantity,
          currencyCode: input.currencyCode,
          exchangeRate: input.exchangeRate,
          markup: input.markup,
        }),
      },
    );
  },
};

export default loggedExpenseUpdate;
