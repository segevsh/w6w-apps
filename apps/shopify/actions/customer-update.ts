import type { ActionDefinition } from "@w6w/types";
import { ShopifyClient, unset } from "../lib/client.ts";

interface Input {
  customerId: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string;
  note?: string;
}

const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description: "Update a customer's profile.",
  idempotent: true,
  params: [
    { key: "customerId", label: "Customer ID", type: "number", required: true },
    { key: "email", label: "Email", type: "string", row: "contact" },
    { key: "phone", label: "Phone", type: "string", row: "contact" },
    { key: "firstName", label: "First name", type: "string", row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated. REPLACES the customer's current tags.",
    },
    { key: "note", label: "Note", type: "text", config: { multiline: true } },
  ],
  output: [
    { key: "customer.id", type: "number", label: "Customer ID" },
    { key: "customer.tags", type: "string", label: "Tags" },
  ],

  execute(input, ctx) {
    return new ShopifyClient(ctx).request(`/customers/${input.customerId}.json`, {
      method: "PUT",
      body: {
        customer: {
          id: input.customerId,
          email: unset(input.email),
          phone: unset(input.phone),
          first_name: unset(input.firstName),
          last_name: unset(input.lastName),
          tags: unset(input.tags),
          note: unset(input.note),
        },
      },
    });
  },
};

export default customerUpdate;
