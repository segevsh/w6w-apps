import type { ActionDefinition } from "@w6w/types";
import { WooCommerceClient } from "../lib/client.ts";

interface Input {
  customerId: string;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Retrieve a single customer by ID.",
  params: [
    { key: "customerId", label: "Customer ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First Name" },
    { key: "last_name", type: "string", label: "Last Name" },
    { key: "username", type: "string", label: "Username" },
    { key: "role", type: "string", label: "Role" },
  ],

  execute(input, ctx) {
    const client = WooCommerceClient.fromConnection(ctx);
    return client.request(`/customers/${input.customerId}`);
  },
};

export default customerGet;
