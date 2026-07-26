import type { ActionDefinition } from "@w6w/types";
import { StripeClient } from "../lib/client.ts";

const customerGet: ActionDefinition<{ customerId: string }> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Retrieve a customer by id.",
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      placeholder: "cus_…",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Customer ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "name", type: "string", label: "Name" },
    { key: "balance", type: "number", label: "Balance" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  execute(input, ctx) {
    return new StripeClient(ctx).request(`/customers/${encodeURIComponent(input.customerId)}`);
  },
};

export default customerGet;
