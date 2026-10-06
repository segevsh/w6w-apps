import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  documentNumber: string;
}

const invoiceCancel: ActionDefinition<Input> = {
  key: "invoice-cancel",
  type: "perform",
  resource: "invoice",
  title: "Cancel Invoice",
  description: "Cancel an invoice.",
  idempotent: false,
  params: [
    {
      "key": "documentNumber",
      "label": "Invoice document number",
      "type": "string",
      "required": true,
    },
  ],
  output: [
    {
      "key": "Invoice",
      "type": "object",
      "label": "Cancel Invoice result",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).put(`/3/invoices/${seg(input.documentNumber)}/cancel`);
  },
};

export default invoiceCancel;
