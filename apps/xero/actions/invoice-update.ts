import type { ActionDefinition } from "@w6w/types";
import { jsonObject, XeroClient } from "../lib/client.ts";
import { invoiceId } from "../lib/params.ts";

interface Input {
  invoiceId: string;
  fields: unknown;
}

const invoiceUpdate: ActionDefinition<Input> = {
  key: "invoice-update",
  type: "perform",
  resource: "invoice",
  title: "Update Invoice",
  description:
    "Update an existing invoice's fields — most commonly its Status (e.g. to AUTHORISED).",
  // POSTing the same field set twice converges on the same record.
  idempotent: true,
  params: [
    invoiceId,
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: 'Object of Xero field names -> values, e.g. { "Status": "AUTHORISED" }.',
    },
  ],
  output: [{ key: "Invoices", type: "array", label: "Invoices" }],

  execute(input, ctx) {
    return new XeroClient(ctx).request(`/Invoices/${encodeURIComponent(input.invoiceId)}`, {
      method: "POST",
      body: { Invoices: [jsonObject(input.fields, "fields")] },
    });
  },
};

export default invoiceUpdate;
