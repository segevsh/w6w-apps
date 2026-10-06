import type { ActionDefinition } from "@w6w/types";
import { compact, FortnoxClient, jsonObject } from "../lib/client.ts";

interface Input {
  name?: string;
  type?: string;
  customerNumber?: string;
  organisationNumber?: string;
  email?: string;
  phone1?: string;
  address1?: string;
  address2?: string;
  zipCode?: string;
  city?: string;
  countryCode?: string;
  currency?: string;
  vatNumber?: string;
  vatType?: string;
  termsOfPayment?: string;
  emailInvoice?: string;
  active?: boolean;
  comments?: string;
  additionalFields?: unknown;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer. Only the name is required.",
  idempotent: false,
  params: [
    {
      "key": "name",
      "label": "Name",
      "type": "string",
    },
    {
      "key": "type",
      "label": "Type",
      "type": "select",
      "options": [
        {
          "value": "PRIVATE",
          "label": "PRIVATE",
        },
        {
          "value": "COMPANY",
          "label": "COMPANY",
        },
      ],
    },
    {
      "key": "customerNumber",
      "label": "Customer number",
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
      "key": "address2",
      "label": "Address line 2",
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
      "hint": "ISO 3166-1 alpha-2, e.g. SE.",
    },
    {
      "key": "currency",
      "label": "Currency",
      "type": "string",
      "hint": "ISO 4217, e.g. SEK.",
    },
    {
      "key": "vatNumber",
      "label": "VAT number",
      "type": "string",
    },
    {
      "key": "vatType",
      "label": "VAT type",
      "type": "select",
      "options": [
        {
          "value": "SEVAT",
          "label": "SEVAT",
        },
        {
          "value": "SEREVERSEDVAT",
          "label": "SEREVERSEDVAT",
        },
        {
          "value": "EUREVERSEDVAT",
          "label": "EUREVERSEDVAT",
        },
        {
          "value": "EUVAT",
          "label": "EUVAT",
        },
        {
          "value": "EXPORT",
          "label": "EXPORT",
        },
      ],
    },
    {
      "key": "termsOfPayment",
      "label": "Terms of payment code",
      "type": "string",
    },
    {
      "key": "emailInvoice",
      "label": "Invoice email",
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
      "key": "Customer",
      "type": "object",
      "label": "Create Customer result",
    },
  ],

  execute(input, ctx) {
    const payload = {
      Name: input.name,
      Type: input.type,
      CustomerNumber: input.customerNumber,
      OrganisationNumber: input.organisationNumber,
      Email: input.email,
      Phone1: input.phone1,
      Address1: input.address1,
      Address2: input.address2,
      ZipCode: input.zipCode,
      City: input.city,
      CountryCode: input.countryCode,
      Currency: input.currency,
      VATNumber: input.vatNumber,
      VATType: input.vatType,
      TermsOfPayment: input.termsOfPayment,
      EmailInvoice: input.emailInvoice,
      Active: input.active,
      Comments: input.comments,
    };
    return new FortnoxClient(ctx).post(
      "/3/customers",
      {
        Customer: {
          ...compact(payload),
          ...jsonObject(input.additionalFields, "additionalFields"),
        },
      },
    );
  },
};

export default customerCreate;
