import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, encodeId } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  invoiceId: string;
}

const action: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Get one invoice with its sections and line items.",
  params: [
    idParam("invoiceId", "Invoice id", "From List Job Invoices."),
  ],
  output: [
    { key: "id", type: "string", label: "Invoice id" },
    { key: "jobId", type: "string", label: "Job id" },
    { key: "invoiceNumber", type: "string", label: "Invoice number" },
    { key: "currentInvoiceState", type: "string", label: "Paid, Unpaid, Void or Draft" },
    { key: "totalPrice", type: "number", label: "Total price" },
    { key: "balanceDue", type: "number", label: "Balance due" },
    { key: "sections", type: "array", label: "Invoice sections" },
  ],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get(`/invoices/${encodeId(input.invoiceId)}`);
  },
};

export default action;
