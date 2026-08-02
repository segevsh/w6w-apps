import type { ActionDefinition } from "@w6w/types";
import { jsonObject, QuickBooksClient } from "../lib/client.ts";

interface Input {
  displayName: string;
  additionalFields?: unknown;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a new customer.",
  // QuickBooks mints a new Id per call and offers no request key, so a retry
  // creates a duplicate customer.
  idempotent: false,
  params: [
    { key: "displayName", label: "Display Name", type: "string", required: true },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint:
        'Merged into the Customer object using QuickBooks\' own field names, e.g. { "PrimaryEmailAddr": { "Address": "a@b.com" }, "CompanyName": "Acme" }.',
    },
  ],
  output: [{ key: "Customer", type: "object", label: "Customer" }],

  execute(input, ctx) {
    return new QuickBooksClient(ctx).request("/customer", {
      method: "POST",
      body: {
        DisplayName: input.displayName,
        ...jsonObject(input.additionalFields, "additionalFields"),
      },
    });
  },
};

export default customerCreate;
