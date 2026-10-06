import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  documentNumber: string;
}

const invoiceCredit: ActionDefinition<Input> = {
  key: "invoice-credit",
  type: "perform",
  resource: "invoice",
  title: "Credit Invoice",
  description:
    "Create a credit invoice for this invoice; it is referenced in CreditInvoiceReference.",
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
      "label": "Credit Invoice result",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).put(`/3/invoices/${seg(input.documentNumber)}/credit`);
  },
};

export default invoiceCredit;
