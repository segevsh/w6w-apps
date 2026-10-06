import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  documentNumber: string;
}

const invoiceSendEmail: ActionDefinition<Input> = {
  key: "invoice-send-email",
  type: "perform",
  resource: "invoice",
  title: "Send Invoice By Email",
  description:
    "Email the invoice to the customer. Fortnox exposes this as a GET that has a side effect.",
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
      "label": "Send Invoice By Email result",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get(`/3/invoices/${seg(input.documentNumber)}/email`);
  },
};

export default invoiceSendEmail;
