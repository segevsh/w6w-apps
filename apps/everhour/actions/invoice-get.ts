import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `GET /invoices/{invoiceId}` — Fetch one invoice with its line items.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  invoiceId: number;
}

const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Fetch one invoice with its line items.",
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
    return new EverhourClient(ctx).one(`/invoices/${encodeId(input.invoiceId)}`);
  },
};

export default invoiceGet;
