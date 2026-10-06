import type { ActionDefinition } from "@w6w/types";
import { seg, UscreenClient } from "../lib/client.ts";

interface Input {
  invoiceId: string;
}

const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Fetch one invoice by id.",
  params: [
    { "key": "invoiceId", "label": "Invoice ID", "type": "string", "required": true },
  ],
  output: [
    { key: "id", type: "number", label: "Record id (the full vendor object is returned)" },
  ],

  async execute(input, ctx) {
    return (await new UscreenClient(ctx).call<Record<string, unknown>>(
      "GET",
      `/invoices/${seg(input.invoiceId)}`,
      {},
    )) ?? {};
  },
};

export default invoiceGet;
