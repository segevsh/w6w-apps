import type { ActionDefinition } from "@w6w/types";
import { XeroClient } from "../lib/client.ts";
import { invoiceId } from "../lib/params.ts";

interface Input {
  invoiceId: string;
}

const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Retrieve one invoice by its InvoiceID or InvoiceNumber.",
  params: [invoiceId],
  output: [{ key: "Invoices", type: "array", label: "Invoices" }],

  execute(input, ctx) {
    return new XeroClient(ctx).request(`/Invoices/${encodeURIComponent(input.invoiceId)}`);
  },
};

export default invoiceGet;
