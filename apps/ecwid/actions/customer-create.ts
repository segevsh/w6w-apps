import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, mergeBody } from "../lib/client.ts";
import { extraFieldsParam } from "../lib/params.ts";

/**
 * `POST /customers` — create a customer.
 *
 * `email` is the only field the vendor marks **Required**. The documented create
 * body also accepts `password`, but only "for stores with the legacy customer
 * sign-in" — it is deliberately not exposed here: handing a workflow step a
 * customer's password is a liability this app does not need, and a store on the
 * newer sign-in cannot use it anyway.
 *
 * Answers `{"id": <new customer id>}`.
 *
 * Not idempotent: no idempotency key on this endpoint, so a retried create makes
 * a second customer record. Ecwid rejects a duplicate email with `409
 * CONSTRAINT_VIOLATION`, which surfaces as an error rather than being swallowed.
 */
interface Input {
  email: string;
  billingPerson?: unknown;
  shippingAddresses?: unknown;
  contacts?: unknown;
  customerGroupId?: number;
  b2b_b2c?: string;
  taxId?: string;
  taxIdValid?: boolean;
  taxExempt?: boolean;
  acceptMarketing?: boolean;
  lang?: string;
  privateAdminNotes?: string;
  extraFields?: unknown;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer record. The email is required by the API.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "billingPerson",
      label: "Billing person",
      type: "json",
      hint: '`{"name","companyName","street","city","countryCode","countryName",' +
        '"postalCode","stateOrProvinceCode","phone"}`.',
    },
    {
      key: "shippingAddresses",
      label: "Shipping addresses",
      type: "json",
      hint: "Array of saved addresses with the same fields as the billing person.",
    },
    {
      key: "contacts",
      label: "Contacts",
      type: "json",
      hint: 'Array of contact entries: `{"type":"EMAIL","contact":"a@b.example"}`. `type` is ' +
        "one of EMAIL, PHONE, FACEBOOK, INSTAGRAM, TWITTER, YOUTUBE, TIKTOK, PINTEREST, VK, " +
        "FB_MESSENGER, WHATSAPP, TELEGRAM, VIBER, URL, OTHER; `contact` is the address or link.",
    },
    {
      key: "customerGroupId",
      label: "Customer group ID",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Assigns the customer to a group; `0` is the store's default group.",
    },
    {
      key: "b2b_b2c",
      label: "Customer type",
      type: "select",
      options: [
        { value: "b2c", label: "Business to customer (default)" },
        { value: "b2b", label: "Business to business" },
      ],
    },
    { key: "taxId", label: "Tax ID", type: "string" },
    {
      key: "taxIdValid",
      label: "Tax ID validated",
      type: "boolean",
      advanced: true,
      hint: "A valid tax id is the precondition for `taxExempt`.",
    },
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
      hint:
        "Set this only from evidence of consent; it is what the storefront's own checkbox sets.",
    },
    {
      key: "lang",
      label: "Language",
      type: "string",
      placeholder: "en",
      advanced: true,
      hint: "Must be one of the translations enabled in the store, or Ecwid answers 400 " +
        "LANGUAGES_NOT_ALLOWED.",
    },
    { key: "privateAdminNotes", label: "Private admin notes", type: "string", advanced: true },
    extraFieldsParam,
  ],
  output: [{ key: "id", type: "number", label: "ID of the created customer" }],

  execute(input, ctx) {
    const body = mergeBody({
      email: input.email,
      billingPerson: input.billingPerson,
      shippingAddresses: input.shippingAddresses,
      contacts: input.contacts,
      customerGroupId: input.customerGroupId,
      b2b_b2c: input.b2b_b2c,
      taxId: input.taxId,
      taxIdValid: input.taxIdValid,
      taxExempt: input.taxExempt,
      acceptMarketing: input.acceptMarketing,
      lang: input.lang,
      privateAdminNotes: input.privateAdminNotes,
    }, input.extraFields);
    return new EcwidClient(ctx).json("/customers", { method: "POST", body });
  },
};

export default customerCreate;
