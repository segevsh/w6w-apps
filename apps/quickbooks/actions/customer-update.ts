import type { ActionDefinition } from "@w6w/types";
import { jsonObject, QuickBooksClient } from "../lib/client.ts";
import { customerId } from "../lib/params.ts";

interface Input {
  customerId: string;
  syncToken: string;
  fields: unknown;
}

const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description: "Sparse-update a customer — only the fields supplied are changed.",
  // POSTing the same field set against the same SyncToken twice converges on
  // the same record (a stale SyncToken on the retry fails loudly instead).
  idempotent: true,
  params: [
    customerId,
    {
      key: "syncToken",
      label: "Sync Token",
      type: "string",
      required: true,
      hint: "The customer's current SyncToken (from a prior get/list) — QuickBooks rejects a stale one.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: 'Object of QuickBooks field names -> values, e.g. { "CompanyName": "Acme Inc" }.',
    },
  ],
  output: [{ key: "Customer", type: "object", label: "Customer" }],

  execute(input, ctx) {
    return new QuickBooksClient(ctx).request("/customer", {
      method: "POST",
      body: {
        Id: input.customerId,
        SyncToken: input.syncToken,
        sparse: true,
        ...jsonObject(input.fields, "fields"),
      },
    });
  },
};

export default customerUpdate;
