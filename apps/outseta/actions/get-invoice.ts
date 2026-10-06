import type { ActionDefinition } from "@w6w/types";
import { OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  invoiceUid: string;
}

/** `GET /api/v1/billing/invoices/{invoiceUid}` — Retrieve one invoice by Uid. */
const getInvoice: ActionDefinition<Input> = {
  key: "get-invoice",
  type: "read",
  resource: "billing",
  title: "Get Invoice",
  description: "Retrieve one invoice by Uid.",
  params: [
    {
      key: "invoiceUid",
      label: "Invoice Uid",
      type: "string",
      hint: "The invoice's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
  ],
  output: [
    {
      key: "Uid",
      type: "string",
      label: "Uid",
    },
    {
      key: "Created",
      type: "string",
      label: "Created",
    },
    {
      key: "Updated",
      type: "string",
      label: "Updated",
    },
  ],

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(
      `/billing/invoices/${pathId(input.invoiceUid)}`,
      { method: "GET" },
    );
  },
};

export default getInvoice;
