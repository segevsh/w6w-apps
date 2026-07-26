import type { ActionDefinition } from "@w6w/types";
import { ShopifyClient, unset } from "../lib/client.ts";

interface Input {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string;
  note?: string;
  acceptsMarketing?: boolean;
  addresses?: unknown;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer. Shopify requires at least an email or a phone number.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", row: "contact" },
    {
      key: "phone",
      label: "Phone",
      type: "string",
      row: "contact",
      hint: "E.164 format, e.g. +447700900000.",
    },
    { key: "firstName", label: "First name", type: "string", row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated." },
    { key: "note", label: "Note", type: "text", config: { multiline: true } },
    {
      key: "acceptsMarketing",
      label: "Accepts marketing",
      type: "boolean",
      hint: "Only set this where you actually hold consent.",
    },
    {
      key: "addresses",
      label: "Addresses",
      type: "json",
      advanced: true,
      hint: 'Array, e.g. [{ "address1": "1 High St", "city": "London", "country": "GB" }].',
    },
  ],
  output: [
    { key: "customer.id", type: "number", label: "Customer ID" },
    { key: "customer.email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    if (!input.email && !input.phone) {
      throw new Error("Provide at least an `email` or a `phone` — Shopify rejects neither.");
    }
    return new ShopifyClient(ctx).request("/customers.json", {
      method: "POST",
      body: {
        customer: {
          email: unset(input.email),
          phone: unset(input.phone),
          first_name: unset(input.firstName),
          last_name: unset(input.lastName),
          tags: unset(input.tags),
          note: unset(input.note),
          // Shopify's modern field; the legacy `accepts_marketing` is deprecated.
          email_marketing_consent: input.acceptsMarketing === undefined
            ? undefined
            : { state: input.acceptsMarketing ? "subscribed" : "not_subscribed" },
          addresses: input.addresses,
        },
      },
    });
  },
};

export default customerCreate;
