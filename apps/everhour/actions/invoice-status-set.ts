import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `POST /invoices/{invoiceId}/{status}` — Mark an invoice as draft, sent or paid.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  invoiceId: number;
  status: string;
}

const invoiceStatusSet: ActionDefinition<Input> = {
  key: "invoice-status-set",
  type: "perform",
  resource: "invoice",
  title: "Set Invoice Status",
  description: "Mark an invoice as draft, sent or paid.",
  idempotent: true,
  params: [
    {
      key: "invoiceId",
      label: "Invoice ID",
      type: "number",
      required: true,
      hint: "Numeric invoice id (from List Invoices).",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [{ value: "draft", label: "draft" }, { value: "sent", label: "sent" }, {
        value: "paid",
        label: "paid",
      }],
      hint: "New invoice status.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "status", type: "string", label: "draft, sent or paid" },
    { key: "totalAmount", type: "number", label: "Total in cents" },
    { key: "invoiceItems", type: "array", label: "Line items" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(
      `/invoices/${encodeId(input.invoiceId)}/${encodeId(input.status)}`,
      { method: "POST" },
    );
  },
};

export default invoiceStatusSet;
