import type { ActionDefinition } from "@w6w/types";
import { compact, StreamtimeClient } from "../lib/client.ts";
import { dateParam, idParam, optionalIdParam } from "../lib/params.ts";

/**
 * `POST /logged_expenses` — log an expense against a job.
 *
 * ## The body is wrapped
 *
 * Unlike every other create route on this API, the request body is
 * `{ "loggedExpense": { … } }` — the model is nested under its own name, as the
 * document's request schema shows. The **update** route
 * (`logged-expense-update`) takes the bare model, so the two are not
 * interchangeable.
 *
 * `userId`, `type`, `loggedExpenseStatus`, `currencySymbol`, the computed totals
 * and the external-accounting fields are read-only.
 */
interface Input {
  jobId: number;
  jobPhaseId: number;
  itemName: string;
  loggedExpenseStatusId?: number;
  date?: string;
  requiredDate?: string;
  purchaseOrderNumber?: string;
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

const loggedExpenseCreate: ActionDefinition<Input> = {
  key: "logged-expense-create",
  type: "perform",
  resource: "logged-expense",
  title: "Create Logged Expense",
  description:
    "Log an expense against a job and phase, with its supplier, pricing method, cost and sell " +
    "rates.",
  idempotent: false,
  params: [
    idParam("jobId", "Job ID", "The job the expense belongs to."),
    idParam("jobPhaseId", "Phase ID", "The phase the expense is logged against."),
    {
      key: "itemName",
      label: "Item Name",
      type: "string",
      required: true,
      placeholder: "Concrete mix M20",
    },
    optionalIdParam("loggedExpenseStatusId", "Status ID", "The logged-expense status id."),
    dateParam("date", "Date", "When the expense was incurred."),
    dateParam("requiredDate", "Required Date"),
    { key: "purchaseOrderNumber", label: "Purchase Order Number", type: "string" },
    optionalIdParam("itemPricingMethodId", "Pricing Method ID", "How the expense is priced."),
    optionalIdParam("supplierCompanyId", "Supplier Company ID"),
    optionalIdParam("supplierContactId", "Supplier Contact ID"),
    { key: "description", label: "Description", type: "text" },
    { key: "reference", label: "Reference", type: "string" },
    { key: "costRate", label: "Cost Rate", type: "number" },
    { key: "sellRate", label: "Sell Rate", type: "number" },
    { key: "quantity", label: "Quantity", type: "number" },
    { key: "currencyCode", label: "Currency Code", type: "string", placeholder: "GBP" },
    { key: "exchangeRate", label: "Exchange Rate", type: "number" },
    { key: "markup", label: "Markup %", type: "number", validation: { min: 0, max: 100 } },
  ],
  output: [
    { key: "id", type: "number", label: "New logged expense ID" },
    { key: "jobId", type: "number", label: "Job ID" },
    { key: "itemName", type: "string", label: "Item name" },
    { key: "type", type: "string", label: "`Expense` or `Purchase Order`" },
    { key: "purchaseOrderId", type: "number", label: "Purchase order ID, if it is one" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request("/logged_expenses", {
      method: "POST",
      body: {
        loggedExpense: compact({
          jobId: input.jobId,
          jobPhaseId: input.jobPhaseId,
          itemName: input.itemName,
          loggedExpenseStatusId: input.loggedExpenseStatusId,
          date: input.date,
          requiredDate: input.requiredDate,
          purchaseOrderNumber: input.purchaseOrderNumber,
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
    });
  },
};

export default loggedExpenseCreate;
