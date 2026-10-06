import type { ActionDefinition } from "@w6w/types";
import { QuadernoClient } from "../lib/client.ts";

interface Input {
  id: number;
}

const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Fetch a single invoice by ID.",
  params: [
    { key: "id", label: "Invoice ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "number", type: "string", label: "Number" },
    { key: "state", type: "string", label: "State" },
    { key: "total_cents", type: "number", label: "Total (cents)" },
    { key: "permalink", type: "string", label: "Public URL" },
    { key: "pdf", type: "string", label: "PDF URL" },
  ],

  execute(input, ctx) {
    return new QuadernoClient(ctx).request(`/invoices/${input.id}`);
  },
};

export default invoiceGet;
