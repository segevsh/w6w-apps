import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `POST /invoices/{invoiceId}/export` — Export an invoice to the connected accounting system (Xero, QuickBooks or FreshBooks).
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  invoiceId: number;
}

const invoiceExport: ActionDefinition<Input> = {
  key: "invoice-export",
  type: "perform",
  resource: "invoice",
  title: "Export Invoice",
  description:
    "Export an invoice to the connected accounting system (Xero, QuickBooks or FreshBooks).",
  idempotent: false,
  params: [
    {
      key: "invoiceId",
      label: "Invoice ID",
      type: "number",
      required: true,
      hint: "Numeric invoice id (from List Invoices).",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "status", type: "string", label: "draft, sent or paid" },
    { key: "totalAmount", type: "number", label: "Total in cents" },
    { key: "invoiceItems", type: "array", label: "Line items" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/invoices/${encodeId(input.invoiceId)}/export`, {
      method: "POST",
    });
  },
};

export default invoiceExport;
