import type { ActionDefinition } from "@w6w/types";
import { AxonautClient, compact, encodeId, toArray, toObject } from "../lib/client.ts";

/**
 * `PATCH /api/v2/companies/{companyId}` — Update a company; only the fields you send change.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  companyId: number;
  name: string;
  address_contact_name?: string;
  address_street?: string;
  address_zip_code?: string;
  address_city?: string;
  address_country?: string;
  currency?: string;
  language?: string;
  thirdparty_code?: string;
  intracommunity_number?: string;
  iban?: string;
  bic?: string;
  siret?: string;
  comments?: string;
  custom_fields?: string | Record<string, unknown> | unknown[];
  categories?: string | Record<string, unknown> | unknown[];
  internal_id?: string;
  business_manager?: string;
}

const companyUpdate: ActionDefinition<Input> = {
  key: "company-update",
  type: "perform",
  resource: "company",
  title: "Update Company",
  description: "Update a company; only the fields you send change.",
  idempotent: true,
  params: [
    {
      key: "companyId",
      label: "Company ID",
      type: "number",
      required: true,
      hint: "Numeric Axonaut id of the company.",
    },
    { key: "name", label: "Name", type: "string", required: true, hint: "Company name." },
    {
      key: "address_contact_name",
      label: "Contact name",
      type: "string",
      hint: "Name on the address.",
    },
    { key: "address_street", label: "Street", type: "string", hint: "Street." },
    { key: "address_zip_code", label: "ZIP code", type: "string", hint: "ZIP code." },
    { key: "address_city", label: "City", type: "string", hint: "City." },
    { key: "address_country", label: "Country", type: "string", hint: "Country." },
    { key: "currency", label: "Currency", type: "string", hint: "Currency code." },
    {
      key: "language",
      label: "Language",
      type: "string",
      hint: "Language (see the languages list).",
    },
    {
      key: "thirdparty_code",
      label: "Third-party code",
      type: "string",
      hint: "Accounting third-party code.",
    },
    {
      key: "intracommunity_number",
      label: "VAT number",
      type: "string",
      hint: "Intra-community VAT number.",
    },
    { key: "iban", label: "IBAN", type: "string", hint: "Bank account IBAN." },
    { key: "bic", label: "BIC", type: "string", hint: "Bank BIC." },
    { key: "siret", label: "SIRET", type: "string", hint: "French company registration number." },
    { key: "comments", label: "Comments", type: "text", hint: "Free-text comments." },
    {
      key: "custom_fields",
      label: "Custom fields",
      type: "json",
      hint: 'JSON object `{"customFieldName": value}`; names come from the custom fields list.',
    },
    { key: "categories", label: "Categories", type: "json", hint: "JSON array of category names." },
    {
      key: "internal_id",
      label: "Internal ID",
      type: "string",
      hint: "Your own internal reference.",
    },
    {
      key: "business_manager",
      label: "Business manager",
      type: "string",
      hint: "Email of the user who manages the company.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Company ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "is_customer", type: "boolean", label: "Is customer" },
    { key: "is_prospect", type: "boolean", label: "Is prospect" },
    { key: "address_city", type: "string", label: "City" },
    { key: "custom_fields", type: "object", label: "Custom fields" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).one(`/companies/${encodeId(input.companyId)}`, {
      method: "PATCH",
      body: compact({
        "name": input.name,
        "address_contact_name": input.address_contact_name,
        "address_street": input.address_street,
        "address_zip_code": input.address_zip_code,
        "address_city": input.address_city,
        "address_country": input.address_country,
        "currency": input.currency,
        "language": input.language,
        "thirdparty_code": input.thirdparty_code,
        "intracommunity_number": input.intracommunity_number,
        "iban": input.iban,
        "bic": input.bic,
        "siret": input.siret,
        "comments": input.comments,
        "custom_fields": toObject(input.custom_fields, "custom_fields"),
        "categories": toArray(input.categories, "categories"),
        "internal_id": input.internal_id,
        "business_manager": input.business_manager,
      }),
    });
  },
};

export default companyUpdate;
