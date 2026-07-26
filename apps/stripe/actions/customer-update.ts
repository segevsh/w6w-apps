import type { ActionDefinition } from "@w6w/types";
import { metadata, StripeClient, unset } from "../lib/client.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  customerId: string;
  email?: string;
  name?: string;
  phone?: string;
  description?: string;
  address?: unknown;
  metadata?: unknown;
}

const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description: "Update a customer. Only the fields you fill in are sent.",
  idempotent: true,
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      placeholder: "cus_…",
    },
    { key: "email", label: "Email", type: "string", row: "who" },
    { key: "name", label: "Name", type: "string", row: "who" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    { key: "address", label: "Address", type: "json", advanced: true },
    metadataParam,
  ],
  output: [
    { key: "id", type: "string", label: "Customer ID" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    return new StripeClient(ctx).request(`/customers/${encodeURIComponent(input.customerId)}`, {
      form: {
        email: unset(input.email),
        name: unset(input.name),
        phone: unset(input.phone),
        description: unset(input.description),
        address: input.address,
        metadata: metadata(input.metadata),
      },
    });
  },
};

export default customerUpdate;
