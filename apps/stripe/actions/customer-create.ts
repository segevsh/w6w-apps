import type { ActionDefinition } from "@w6w/types";
import { metadata, StripeClient, unset } from "../lib/client.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  email?: string;
  name?: string;
  phone?: string;
  description?: string;
  paymentMethod?: string;
  address?: unknown;
  metadata?: unknown;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer record.",
  // The client sends the invocation id as Stripe's Idempotency-Key, so a
  // retried invocation replays the original response rather than duplicating.
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", row: "who" },
    { key: "name", label: "Name", type: "string", row: "who" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    {
      key: "paymentMethod",
      label: "Default payment method",
      type: "string",
      advanced: true,
      hint: "A PaymentMethod id (`pm_…`) already attached to this customer.",
    },
    {
      key: "address",
      label: "Address",
      type: "json",
      advanced: true,
      hint:
        'e.g. { "line1": "1 High St", "city": "London", "country": "GB", "postal_code": "E1 6AN" }',
    },
    metadataParam,
  ],
  output: [
    { key: "id", type: "string", label: "Customer ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "name", type: "string", label: "Name" },
    { key: "created", type: "number", label: "Created (unix seconds)" },
  ],

  execute(input, ctx) {
    return new StripeClient(ctx).request("/customers", {
      form: {
        email: unset(input.email),
        name: unset(input.name),
        phone: unset(input.phone),
        description: unset(input.description),
        address: input.address,
        metadata: metadata(input.metadata),
        invoice_settings: input.paymentMethod
          ? { default_payment_method: input.paymentMethod }
          : undefined,
      },
    });
  },
};

export default customerCreate;
