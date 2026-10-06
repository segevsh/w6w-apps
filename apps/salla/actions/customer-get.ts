import type { ActionDefinition } from "@w6w/types";
import { SallaClient, seg, toArray } from "../lib/client.ts";

interface Input {
  customer_id: number;
  fields?: string | number | Array<string | number>;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch one customer by ID. Needs the `customers.read` scope.",

  params: [
    {
      "key": "customer_id",
      "label": "Customer ID",
      "type": "number",
      "required": true,
    },
    {
      "key": "fields",
      "label": "Extra fields",
      "type": "string",
      "hint": "Comma-separated extras, e.g. orders_count, wallet_balance, is_blocked.",
    },
  ],
  output: [
    {
      "key": "status",
      "type": "number",
      "label": "HTTP status echoed in the envelope",
    },
    {
      "key": "success",
      "type": "boolean",
      "label": "Always true on success",
    },
    {
      "key": "data",
      "type": "object",
      "label": "The record",
    },
  ],

  execute(input, ctx) {
    const client = new SallaClient(ctx);
    return client.get(`/customers/${seg(input.customer_id)}`, {
      fields: toArray(input.fields, "fields"),
    });
  },
};

export default customerGet;
