import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  givenNumber: string;
}

const supplierInvoiceBookkeep: ActionDefinition<Input> = {
  key: "supplier-invoice-bookkeep",
  type: "perform",
  resource: "supplier-invoice",
  title: "Bookkeep Supplier Invoice",
  description: "Book the supplier invoice into the ledger.",
  idempotent: false,
  params: [
    {
      "key": "givenNumber",
      "label": "Given number",
      "type": "string",
      "required": true,
    },
  ],
  output: [
    {
      "key": "SupplierInvoice",
      "type": "object",
      "label": "Bookkeep Supplier Invoice result",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).put(`/3/supplierinvoices/${seg(input.givenNumber)}/bookkeep`);
  },
};

export default supplierInvoiceBookkeep;
