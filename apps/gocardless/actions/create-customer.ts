import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, GoCardlessClient } from "../lib/client.ts";
import { idempotencyKeyParam, metadataParam } from "../lib/params.ts";

/**
 * `POST /customers` — create a customer.
 *
 * ## Restricted unless the account's payment pages are approved
 *
 * GoCardless lists "Customer — create" among the endpoints restricted to apps
 * whose payment pages are approved as scheme-rules compliant, so a `403
 * forbidden` here is normally "this account is under review", not "the request
 * is wrong". It is still worth building: the restriction is an account state a
 * merchant can be granted out of, and every mandate that follows needs a
 * customer first. See the README's "Known vendor restrictions".
 *
 * ## A customer is not a payer
 *
 * Only `email`, a name and an address are sent here — no bank details. The bank
 * account and the authorisation to debit it belong to the mandate, which this
 * app does not create (see the README). A `customer` row on its own authorises
 * nothing.
 *
 * ## Field combinations GoCardless accepts
 *
 * `given_name` + `family_name` for a person, `company_name` for a business.
 * GoCardless stores `country_code` as ISO 3166-1 alpha-2 (`GB`, not `UK`), and
 * `metadata` is echoed back on every read of the resource.
 */
interface Input {
  email?: string;
  givenName?: string;
  familyName?: string;
  companyName?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
  language?: string;
  phoneNumber?: string;
  metadata?: unknown;
  idempotencyKey?: string;
}

const createCustomer: ActionDefinition<Input, Record<string, unknown>> = {
  key: "create-customer",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description:
    "Create a GoCardless customer record. Restricted on accounts whose payment pages are not " +
    "yet approved — a 403 here means the account is under review, not that the request is bad.",
  // GoCardless de-duplicates nothing about a customer, and although the
  // Idempotency-Key below makes a retry of the same step safe, the endpoint has
  // no natural key — so the honest declaration is `false`: the runtime must not
  // replay it on its own.
  idempotent: false,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Where GoCardless sends the mandate notification and any Direct Debit advance notice.",
    },
    {
      key: "givenName",
      label: "Given name",
      type: "string",
      row: "person",
      hint: "Sent as `given_name`. Use this with Family name for a person.",
    },
    {
      key: "familyName",
      label: "Family name",
      type: "string",
      row: "person",
      hint: "Sent as `family_name`.",
    },
    {
      key: "companyName",
      label: "Company name",
      type: "string",
      hint: "Sent as `company_name`. For a business customer instead of a person's name.",
    },
    {
      key: "addressLine1",
      label: "Address line 1",
      type: "string",
      hint: "Sent as `address_line1`.",
    },
    {
      key: "addressLine2",
      label: "Address line 2",
      type: "string",
      hint: "Sent as `address_line2`.",
    },
    {
      key: "addressLine3",
      label: "Address line 3",
      type: "string",
      hint: "Sent as `address_line3`.",
    },
    { key: "city", label: "City", type: "string", row: "locality" },
    { key: "region", label: "Region", type: "string", row: "locality" },
    {
      key: "postalCode",
      label: "Postal code",
      type: "string",
      row: "locality",
      hint: "Sent as `postal_code`.",
    },
    {
      key: "countryCode",
      label: "Country code",
      type: "string",
      placeholder: "GB",
      hint: "ISO 3166-1 alpha-2 (`GB`, not `UK`). Sent as `country_code`.",
    },
    {
      key: "language",
      label: "Language",
      type: "string",
      advanced: true,
      hint: "Two-letter code for GoCardless's own notifications to this customer.",
    },
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      advanced: true,
      hint: "Sent as `phone_number`.",
    },
    metadataParam(),
    idempotencyKeyParam(),
  ],
  output: [
    { key: "id", type: "string", label: "Customer ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "given_name", type: "string", label: "Given name" },
    { key: "family_name", type: "string", label: "Family name" },
    { key: "company_name", type: "string", label: "Company name" },
    { key: "country_code", type: "string", label: "Country code" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "metadata", type: "object", label: "Metadata" },
  ],

  execute(input, ctx) {
    return new GoCardlessClient(ctx).create(
      "customers",
      "/customers",
      compact({
        email: input.email,
        given_name: input.givenName,
        family_name: input.familyName,
        company_name: input.companyName,
        address_line1: input.addressLine1,
        address_line2: input.addressLine2,
        address_line3: input.addressLine3,
        city: input.city,
        region: input.region,
        postal_code: input.postalCode,
        country_code: input.countryCode,
        language: input.language,
        phone_number: input.phoneNumber,
        metadata: asOptionalJson(input.metadata, "Metadata"),
      }),
      input.idempotencyKey,
    );
  },
};

export default createCustomer;
