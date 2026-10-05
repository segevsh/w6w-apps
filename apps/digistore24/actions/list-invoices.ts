import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  purchase_id: string;
}

const listInvoices: ActionDefinition<Input> = {
  key: "list-invoices",
  type: "search",
  title: "List Invoices",
  description: "List the invoices of one purchase.",
  params: [
    {
      key: "purchase_id",
      label: "Purchase ID",
      type: "string",
      required: true,
      hint: "The Digistore24 order ID, e.g. X26QE8GN.",
    },
  ],
  output: [
    { key: "purchase_id", type: "string", label: "Purchase ID" },
    { key: "invoice_list", type: "array", label: "Invoices" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call("listInvoices", compact({ purchase_id: input.purchase_id }));
  },
};

export default listInvoices;
