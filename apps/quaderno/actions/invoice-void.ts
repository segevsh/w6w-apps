import type { ActionDefinition } from "@w6w/types";
import { QuadernoClient } from "../lib/client.ts";

interface Input {
  id: number;
  voidReason: string;
}

const invoiceVoid: ActionDefinition<Input> = {
  key: "invoice-void",
  type: "perform",
  resource: "invoice",
  title: "Void Invoice",
  description: "Void an invoice. A reason is required.",
  idempotent: false,
  params: [
    { key: "id", label: "Invoice ID", type: "number", required: true },
    { key: "voidReason", label: "Void reason", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "number", type: "string", label: "Number" },
    { key: "state", type: "string", label: "State" },
    { key: "total_cents", type: "number", label: "Total (cents)" },
  ],

  execute(input, ctx) {
    return new QuadernoClient(ctx).request(`/invoices/${input.id}/void`, {
      method: "PUT",
      body: { void_reason: input.voidReason },
    });
  },
};

export default invoiceVoid;
