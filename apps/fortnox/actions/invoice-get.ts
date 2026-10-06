import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  documentNumber: string;
}

const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Fetch one invoice, with its rows, by document number.",
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
      "label": "Invoice record",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get(`/3/invoices/${seg(input.documentNumber)}`);
  },
};

export default invoiceGet;
