import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `DELETE /invoices/{invoiceId}` — Delete an invoice.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  invoiceId: number;
}

const invoiceDelete: ActionDefinition<Input> = {
  key: "invoice-delete",
  type: "perform",
  resource: "invoice",
  title: "Delete Invoice",
  description: "Delete an invoice.",
  idempotent: true,
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
    { key: "ok", type: "boolean", label: "True when the delete succeeded" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/invoices/${encodeId(input.invoiceId)}`, {
      method: "DELETE",
    });
  },
};

export default invoiceDelete;
