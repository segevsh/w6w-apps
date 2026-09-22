import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, encodeId } from "../lib/client.ts";
import { customerIdParam, responseFieldsParam } from "../lib/params.ts";

/**
 * `GET /customers/{customerId}` — one customer.
 *
 * Answers the customer's email, `registered` and `updated` timestamps,
 * `billingPerson`, every saved `shippingAddresses` entry, `contacts` (email,
 * phone and social handles), the customer group name and id, the B2B/B2C flag,
 * tax details and marketing consent.
 *
 * No password is ever returned — the docs only ever accept one on create, and
 * only for stores on the legacy sign-in.
 */
interface Input {
  customerId: string;
  responseFields?: string;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch one customer record, including addresses, contacts and consents.",
  params: [customerIdParam, responseFieldsParam],
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "registered", type: "string", label: "When the customer registered" },
    { key: "billingPerson", type: "object", label: "Billing name and address" },
    { key: "shippingAddresses", type: "array", label: "Saved shipping addresses" },
    { key: "contacts", type: "array", label: "Email, phone and social contacts" },
    { key: "customerGroupId", type: "number", label: "Customer group ID" },
    { key: "taxExempt", type: "boolean", label: "Whether the customer is tax exempt" },
    { key: "acceptMarketing", type: "boolean", label: "Marketing consent" },
  ],

  execute(input, ctx) {
    return new EcwidClient(ctx).json(`/customers/${encodeId(input.customerId)}`, {
      query: { responseFields: input.responseFields },
    });
  },
};

export default customerGet;
