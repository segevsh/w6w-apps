import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, encodeId, mergeBody } from "../lib/client.ts";
import { customerIdParam, extraFieldsParam } from "../lib/params.ts";

/**
 * `PUT /customers/{customerId}` — update a customer.
 *
 * The documented update body covers the same fields as create, minus
 * `password`; `b2b_b2c` is not on this page either, so it is not exposed here.
 *
 * One scope oddity the vendor states: this call needs `read_customers` — the
 * page's "Required access scopes" says `read_customers`, not an update scope —
 * so a connection that can search customers can also update them. There is no
 * `update_customers` scope to ask for.
 *
 * Answers `{"updateCount": 1}`. Idempotent: the same body leaves the same state.
 */
interface Input {
  customerId: string;
  email?: string;
  billingPerson?: unknown;
  shippingAddresses?: unknown;
  contacts?: unknown;
  customerGroupId?: number;
  taxId?: string;
  taxIdValid?: boolean;
  taxExempt?: boolean;
  acceptMarketing?: boolean;
  lang?: string;
  privateAdminNotes?: string;
  extraFields?: unknown;
}

const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description:
    "Update a customer's email, addresses, contacts, group, tax status or marketing consent.",
  idempotent: true,
  params: [
    customerIdParam,
    { key: "email", label: "Email", type: "string" },
    { key: "billingPerson", label: "Billing person", type: "json" },
    {
      key: "shippingAddresses",
      label: "Shipping addresses",
      type: "json",
      hint: "The full array — this replaces the saved address list rather than appending to it.",
    },
    { key: "contacts", label: "Contacts", type: "json" },
    {
      key: "customerGroupId",
      label: "Customer group ID",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    { key: "taxId", label: "Tax ID", type: "string", advanced: true },
    { key: "taxIdValid", label: "Tax ID validated", type: "boolean", advanced: true },
    {
      key: "taxExempt",
      label: "Tax exempt",
      type: "boolean",
      hint: "Requires a valid tax id, per the API.",
    },
    {
      key: "acceptMarketing",
      label: "Accepted marketing",
      type: "boolean",
      hint: "Only set this from evidence of consent — unsetting it removes the customer from " +
        "marketing email.",
    },
    { key: "lang", label: "Language", type: "string", placeholder: "en", advanced: true },
    { key: "privateAdminNotes", label: "Private admin notes", type: "string", advanced: true },
    extraFieldsParam,
  ],
  output: [
    { key: "updateCount", type: "number", label: "1 when the customer was updated" },
  ],

  execute(input, ctx) {
    const body = mergeBody({
      email: input.email,
      billingPerson: input.billingPerson,
      shippingAddresses: input.shippingAddresses,
      contacts: input.contacts,
      customerGroupId: input.customerGroupId,
      taxId: input.taxId,
      taxIdValid: input.taxIdValid,
      taxExempt: input.taxExempt,
      acceptMarketing: input.acceptMarketing,
      lang: input.lang,
      privateAdminNotes: input.privateAdminNotes,
    }, input.extraFields);
    return new EcwidClient(ctx).json(`/customers/${encodeId(input.customerId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default customerUpdate;
