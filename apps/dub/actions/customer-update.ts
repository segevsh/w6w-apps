import type { ActionDefinition } from "@w6w/types";
import { compact, DubClient, seg } from "../lib/client.ts";
import { CUSTOMER_OUTPUT } from "../lib/customers.ts";

interface Input {
  customerId: string;
  email?: string | null;
  name?: string | null;
  avatar?: string | null;
  externalId?: string;
  stripeCustomerId?: string | null;
  country?: string;
  subscriptionCanceledAt?: string | null;
  includeExpandedFields?: boolean;
}

/** `PATCH /customers/{id}`. */
const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description: "Update a customer's profile, Stripe link or subscription-canceled date.",
  idempotent: true,
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      hint: "The Dub customer ID, or `ext_` followed by your external ID.",
    },
    { key: "email", label: "Email", type: "string" },
    { key: "name", label: "Name", type: "string" },
    { key: "avatar", label: "Avatar URL", type: "string" },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      hint: "The customer's unique ID in your database.",
    },
    {
      key: "stripeCustomerId",
      label: "Stripe customer ID",
      type: "string",
      hint: "Lets Dub attribute recurring Stripe sales to the referring partner.",
    },
    { key: "country", label: "Country", type: "string", hint: "ISO 3166-1 alpha-2." },
    {
      key: "subscriptionCanceledAt",
      label: "Subscription canceled at",
      type: "string",
      hint: "ISO 8601 timestamp of the cancellation.",
    },
    { key: "includeExpandedFields", label: "Include link, partner and discount", type: "boolean" },
  ],
  output: CUSTOMER_OUTPUT,

  execute(input, ctx) {
    const { customerId, includeExpandedFields, ...rest } = input;
    return new DubClient(ctx).request("PATCH", `/customers/${seg(customerId)}`, {
      query: { includeExpandedFields },
      body: compact({ ...rest }),
    });
  },
};

export default customerUpdate;
