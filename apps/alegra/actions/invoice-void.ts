import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, compact, idPath } from "../lib/client.ts";

interface Input {
  id: string;
  cause?: string;
}

const invoiceVoid: ActionDefinition<Input> = {
  key: "invoice-void",
  type: "perform",
  resource: "invoice",
  title: "Void Sales Invoice",
  description:
    "Void (anular) a sales invoice. The record is kept but stops counting in accounting.",
  idempotent: false,
  params: [
    { key: "id", label: "Invoice ID", type: "string", required: true },
    {
      key: "cause",
      label: "Cause",
      type: "string",
      hint: "Reason for voiding. Mexico requires a cancellation code once the invoice is stamped.",
    },
  ],
  output: [
    { key: "code", type: "number", label: "Vendor result code" },
    { key: "message", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    const client = new AlegraClient(ctx);
    return await client.request(`/invoices/${idPath(input.id)}/void`, {
      method: "POST",
      body: compact({ cause: input.cause }),
    });
  },
};

export default invoiceVoid;
