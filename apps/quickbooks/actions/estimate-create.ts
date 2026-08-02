import type { ActionDefinition } from "@w6w/types";
import { jsonArray, jsonObject, QuickBooksClient } from "../lib/client.ts";

interface Input {
  customerId: string;
  lines: unknown;
  additionalFields?: unknown;
}

const estimateCreate: ActionDefinition<Input> = {
  key: "estimate-create",
  type: "perform",
  resource: "estimate",
  title: "Create Estimate",
  description: "Create a quote/estimate for a customer.",
  // QuickBooks mints a new Id per call and offers no request key, so a retry
  // creates a duplicate estimate.
  idempotent: false,
  params: [
    { key: "customerId", label: "Customer ID", type: "string", required: true },
    {
      key: "lines",
      label: "Line items",
      type: "json",
      required: true,
      hint:
        'JSON array of QuickBooks Line objects, e.g. [{ "DetailType": "SalesItemLineDetail", "Amount": 250, "Description": "Design work", "SalesItemLineDetail": { "ItemRef": { "value": "1" } } }].',
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: 'Merged into the Estimate object, e.g. { "ExpirationDate": "2026-09-01" }.',
    },
  ],
  output: [{ key: "Estimate", type: "object", label: "Estimate" }],

  execute(input, ctx) {
    return new QuickBooksClient(ctx).request("/estimate", {
      method: "POST",
      body: {
        CustomerRef: { value: input.customerId },
        Line: jsonArray(input.lines, "lines"),
        ...jsonObject(input.additionalFields, "additionalFields"),
      },
    });
  },
};

export default estimateCreate;
