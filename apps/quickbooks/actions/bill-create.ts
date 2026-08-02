import type { ActionDefinition } from "@w6w/types";
import { jsonArray, jsonObject, QuickBooksClient } from "../lib/client.ts";

interface Input {
  vendorId: string;
  lines: unknown;
  additionalFields?: unknown;
}

const billCreate: ActionDefinition<Input> = {
  key: "bill-create",
  type: "perform",
  resource: "bill",
  title: "Create Bill",
  description: "Create a vendor bill.",
  // QuickBooks mints a new Id per call and offers no request key, so a retry
  // creates a duplicate bill.
  idempotent: false,
  params: [
    { key: "vendorId", label: "Vendor ID", type: "string", required: true },
    {
      key: "lines",
      label: "Line items",
      type: "json",
      required: true,
      hint:
        'JSON array of QuickBooks Line objects, e.g. [{ "DetailType": "AccountBasedExpenseLineDetail", "Amount": 100, "Description": "Office supplies", "AccountBasedExpenseLineDetail": { "AccountRef": { "value": "7" } } }].',
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: 'Merged into the Bill object, e.g. { "DueDate": "2026-08-14" }.',
    },
  ],
  output: [{ key: "Bill", type: "object", label: "Bill" }],

  execute(input, ctx) {
    return new QuickBooksClient(ctx).request("/bill", {
      method: "POST",
      body: {
        VendorRef: { value: input.vendorId },
        Line: jsonArray(input.lines, "lines"),
        ...jsonObject(input.additionalFields, "additionalFields"),
      },
    });
  },
};

export default billCreate;
