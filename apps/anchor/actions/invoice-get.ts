import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, encodeId } from "../lib/client.ts";

/** `GET /invoices/{id}` — Anchor operation `getInvoice`. */
interface Input {
  id: string;
}

const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description:
    "Fetch one invoice: line items, payment information, accounting sync status and amount breakdown.",
  params: [
    { key: "id", label: "Invoice ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "invoiceNumber", type: "string", label: "Invoice number" },
    { key: "status", type: "string", label: "Display status" },
    { key: "totalAmount", type: "string", label: "Total amount" },
    { key: "amountPaid", type: "string", label: "Amount paid" },
    { key: "amountDue", type: "string", label: "Amount due" },
    { key: "dueDate", type: "string", label: "Due date" },
    { key: "lineItems", type: "array", label: "Line items" },
    { key: "link", type: "string", label: "Link to view the invoice" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("GET", `/invoices/${encodeId(input.id)}`);
  },
};

export default invoiceGet;
