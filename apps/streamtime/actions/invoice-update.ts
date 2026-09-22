import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, StreamtimeClient } from "../lib/client.ts";
import { asOptionalJson, dateParam, idParam, modelObjectParam } from "../lib/params.ts";

/**
 * `PUT /invoices/{invoice_id}` — update an invoice.
 *
 * "May transition invoice status", per the vendor — so this is the route that
 * issues an invoice, not just relabels one. Writable fields are `name`,
 * `number`, `reference`, `invoiceType`, `invoiceStatus`, `invoiceDate` and
 * `dueDate`; every amount, `paidDate` and `currencyCode` is read-only, because
 * they follow from the line items and the payments.
 */
interface Input {
  invoiceId: number;
  name?: string;
  number?: string;
  reference?: string;
  invoiceType?: unknown;
  invoiceStatus?: unknown;
  invoiceDate?: string;
  dueDate?: string;
}

const invoiceUpdate: ActionDefinition<Input> = {
  key: "invoice-update",
  type: "perform",
  resource: "invoice",
  title: "Update Invoice",
  description:
    "Update an invoice's name, number, reference, type or status. A status change may issue the " +
    "invoice.",
  idempotent: true,
  params: [
    idParam("invoiceId", "Invoice ID"),
    { key: "name", label: "Name", type: "string" },
    { key: "number", label: "Number", type: "string" },
    { key: "reference", label: "Reference", type: "string" },
    modelObjectParam("invoiceType", "Type", '{ "id": 1, "name": "Progress" }'),
    modelObjectParam("invoiceStatus", "Status", '{ "id": 1, "name": "Draft" }'),
    dateParam("invoiceDate", "Invoice Date"),
    dateParam("dueDate", "Due Date"),
  ],
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "invoiceStatus", type: "object", label: "Status — `{ id, name }`" },
    { key: "invoiceCurrencyTotalAmountIncTax", type: "number", label: "Total inc tax" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/invoices/${encodeId(input.invoiceId)}`, {
      method: "PUT",
      body: compact({
        name: input.name,
        number: input.number,
        reference: input.reference,
        invoiceType: asOptionalJson(input.invoiceType, "invoiceType"),
        invoiceStatus: asOptionalJson(input.invoiceStatus, "invoiceStatus"),
        invoiceDate: input.invoiceDate,
        dueDate: input.dueDate,
      }),
    });
  },
};

export default invoiceUpdate;
