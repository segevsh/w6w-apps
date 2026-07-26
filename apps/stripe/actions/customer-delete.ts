import type { ActionDefinition } from "@w6w/types";
import { StripeClient } from "../lib/client.ts";

/**
 * Deleting a customer also cancels their subscriptions immediately. Their
 * past charges and invoices are kept — Stripe never removes financial records.
 */
const customerDelete: ActionDefinition<{ customerId: string }> = {
  key: "customer-delete",
  type: "perform",
  resource: "customer",
  title: "Delete Customer",
  description:
    "Delete a customer. This immediately cancels their subscriptions; past charges are retained.",
  idempotent: true,
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
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  execute(input, ctx) {
    return new StripeClient(ctx).request(`/customers/${encodeURIComponent(input.customerId)}`, {
      method: "DELETE",
    });
  },
};

export default customerDelete;
