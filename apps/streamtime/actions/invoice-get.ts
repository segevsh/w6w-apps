import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /invoices/{invoice_id}` — one invoice.
 *
 * Amounts are in the **invoice currency** (`invoiceCurrency*`), which is not
 * necessarily the job's — the model carries `exchangeRate` separately. The
 * status and type are `{ id, name }` lookups.
 */
interface Input {
  invoiceId: number;
}

const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Fetch one invoice by id — status, dates, totals and balance.",
  params: [idParam("invoiceId", "Invoice ID", "Ids come from a search over `invoices`.")],
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "jobId", type: "number", label: "Job ID" },
    { key: "name", type: "string", label: "Invoice name" },
    { key: "number", type: "string", label: "Invoice number" },
    { key: "invoiceStatus", type: "object", label: "Status — `{ id, name }`" },
    { key: "currencyCode", type: "string", label: "Invoice currency" },
    { key: "invoiceCurrencyTotalAmountIncTax", type: "number", label: "Total inc tax" },
    { key: "invoiceCurrencyBalance", type: "number", label: "Balance remaining" },
    { key: "invoiceDate", type: "string", label: "Invoice date" },
    { key: "dueDate", type: "string", label: "Due date" },
    { key: "paidDate", type: "string", label: "Paid date" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/invoices/${encodeId(input.invoiceId)}`);
  },
};

export default invoiceGet;
