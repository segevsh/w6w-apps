import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  givenNumber: string;
}

const supplierInvoiceGet: ActionDefinition<Input> = {
  key: "supplier-invoice-get",
  type: "read",
  resource: "supplier-invoice",
  title: "Get Supplier Invoice",
  description: "Fetch one supplier invoice by its Fortnox-given number.",
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
      "label": "Supplier Invoice record",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get(`/3/supplierinvoices/${seg(input.givenNumber)}`);
  },
};

export default supplierInvoiceGet;
