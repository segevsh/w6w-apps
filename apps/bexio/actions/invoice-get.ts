import type { ActionDefinition } from "@w6w/types";
import { BexioClient } from "../lib/client.ts";

interface Input {
  invoiceId: number;
}

const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Fetch a single invoice by ID, including its line-item positions.",
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "document_nr", type: "string", label: "Invoice number" },
    { key: "total", type: "string", label: "Total" },
  ],

  execute(input, ctx) {
    return new BexioClient(ctx).get(`/2.0/kb_invoice/${encodeURIComponent(input.invoiceId)}`);
  },
};

export default invoiceGet;
