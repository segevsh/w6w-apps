import type { ActionDefinition } from "@w6w/types";
import { jsonObject, QuickBooksClient } from "../lib/client.ts";
import { invoiceId } from "../lib/params.ts";

interface Input {
  invoiceId: string;
  syncToken: string;
  fields: unknown;
}

const invoiceUpdate: ActionDefinition<Input> = {
  key: "invoice-update",
  type: "perform",
  resource: "invoice",
  title: "Update Invoice",
  description: "Sparse-update an invoice — only the fields supplied are changed.",
  // POSTing the same field set against the same SyncToken twice converges on
  // the same record (a stale SyncToken on the retry fails loudly instead).
  idempotent: true,
  params: [
    invoiceId,
    {
      key: "syncToken",
      label: "Sync Token",
      type: "string",
      required: true,
      hint: "The invoice's current SyncToken (from a prior get/list) — QuickBooks rejects a stale one.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: 'Object of QuickBooks field names -> values, e.g. { "PrivateNote": "Paid by wire" }.',
    },
  ],
  output: [{ key: "Invoice", type: "object", label: "Invoice" }],

  execute(input, ctx) {
    return new QuickBooksClient(ctx).request("/invoice", {
      method: "POST",
      body: {
        Id: input.invoiceId,
        SyncToken: input.syncToken,
        sparse: true,
        ...jsonObject(input.fields, "fields"),
      },
    });
  },
};

export default invoiceUpdate;
