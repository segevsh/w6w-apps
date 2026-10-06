import type { ActionDefinition } from "@w6w/types";
import { compact, FortnoxClient, jsonObject } from "../lib/client.ts";

interface Input {
  name?: string;
  supplierNumber?: string;
  organisationNumber?: string;
  email?: string;
  phone1?: string;
  address1?: string;
  zipCode?: string;
  city?: string;
  countryCode?: string;
  currency?: string;
  vatNumber?: string;
  bankAccountNumber?: string;
  iban?: string;
  bic?: string;
  bg?: string;
  pg?: string;
  termsOfPayment?: string;
  active?: boolean;
  comments?: string;
  additionalFields?: unknown;
}

const supplierCreate: ActionDefinition<Input> = {
  key: "supplier-create",
  type: "perform",
  resource: "supplier",
  title: "Create Supplier",
  description: "Create a supplier. Only the name is required.",
  idempotent: false,
  params: [
    {
      "key": "name",
      "label": "Name",
      "type": "string",
    },
    {
      "key": "supplierNumber",
      "label": "Supplier number",
      "type": "string",
      "hint": "Omit to let Fortnox assign the next number.",
    },
    {
      "key": "organisationNumber",
      "label": "Organisation number",
      "type": "string",
    },
    {
      "key": "email",
      "label": "Email",
      "type": "string",
    },
    {
      "key": "phone1",
      "label": "Phone",
      "type": "string",
    },
    {
      "key": "address1",
      "label": "Address line 1",
      "type": "string",
    },
    {
      "key": "zipCode",
      "label": "Zip code",
      "type": "string",
    },
    {
      "key": "city",
      "label": "City",
      "type": "string",
    },
    {
      "key": "countryCode",
      "label": "Country code",
      "type": "string",
    },
    {
      "key": "currency",
      "label": "Currency",
      "type": "string",
    },
    {
      "key": "vatNumber",
      "label": "VAT number",
      "type": "string",
    },
    {
      "key": "bankAccountNumber",
      "label": "Bank account number",
      "type": "string",
    },
    {
      "key": "iban",
      "label": "IBAN",
      "type": "string",
    },
    {
      "key": "bic",
      "label": "BIC",
      "type": "string",
    },
    {
      "key": "bg",
      "label": "Bankgiro",
      "type": "string",
    },
    {
      "key": "pg",
      "label": "Plusgiro",
      "type": "string",
    },
    {
      "key": "termsOfPayment",
      "label": "Terms of payment code",
      "type": "string",
    },
    {
      "key": "active",
      "label": "Active",
      "type": "boolean",
    },
    {
      "key": "comments",
      "label": "Comments",
      "type": "string",
    },
    {
      "key": "additionalFields",
      "label": "Additional fields",
      "type": "json",
      "hint":
        'Any other Fortnox field of this record, by its API name, merged into the payload last (e.g. {"Comments": "..."}). Send an empty string to clear a value.',
    },
  ],
  output: [
    {
      "key": "Supplier",
      "type": "object",
      "label": "Create Supplier result",
    },
  ],

  execute(input, ctx) {
    const payload = {
      Name: input.name,
      SupplierNumber: input.supplierNumber,
      OrganisationNumber: input.organisationNumber,
      Email: input.email,
      Phone1: input.phone1,
      Address1: input.address1,
      ZipCode: input.zipCode,
      City: input.city,
      CountryCode: input.countryCode,
      Currency: input.currency,
      VATNumber: input.vatNumber,
      BankAccountNumber: input.bankAccountNumber,
      IBAN: input.iban,
      BIC: input.bic,
      BG: input.bg,
      PG: input.pg,
      TermsOfPayment: input.termsOfPayment,
      Active: input.active,
      Comments: input.comments,
    };
    return new FortnoxClient(ctx).post(
      "/3/suppliers",
      {
        Supplier: {
          ...compact(payload),
          ...jsonObject(input.additionalFields, "additionalFields"),
        },
      },
    );
  },
};

export default supplierCreate;
