import type { ActionDefinition } from "@w6w/types";
import { WooCommerceClient } from "../lib/client.ts";

interface Input {
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  password?: string;
  billing?: Record<string, unknown>;
  shipping?: Record<string, unknown>;
}

interface CustomerBody {
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  password?: string;
  billing?: Record<string, unknown>;
  shipping?: Record<string, unknown>;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a new customer account.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "firstName", label: "First Name", type: "string" },
    { key: "lastName", label: "Last Name", type: "string" },
    { key: "username", label: "Username", type: "string" },
    { key: "password", label: "Password", type: "secret" },
    {
      key: "billing",
      label: "Billing Address",
      type: "json",
      hint: "Object with first_name, last_name, address_1, city, postcode, country, email, phone…",
    },
    {
      key: "shipping",
      label: "Shipping Address",
      type: "json",
      hint: "Object with first_name, last_name, address_1, city, postcode, country…",
    },
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
    const body: CustomerBody = { email: input.email };
    if (input.firstName !== undefined) body.first_name = input.firstName;
    if (input.lastName !== undefined) body.last_name = input.lastName;
    if (input.username !== undefined) body.username = input.username;
    if (input.password !== undefined) body.password = input.password;
    if (input.billing !== undefined) body.billing = input.billing;
    if (input.shipping !== undefined) body.shipping = input.shipping;
    return client.request("/customers", { method: "POST", body });
  },
};

export default customerCreate;
