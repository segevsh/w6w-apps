import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  documentNumber: string;
}

const invoiceBookkeep: ActionDefinition<Input> = {
  key: "invoice-bookkeep",
  type: "perform",
  resource: "invoice",
  title: "Bookkeep Invoice",
  description: "Book the invoice into the ledger (creates a voucher).",
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
      "label": "Bookkeep Invoice result",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).put(`/3/invoices/${seg(input.documentNumber)}/bookkeep`);
  },
};

export default invoiceBookkeep;
