import type { ActionDefinition } from "@w6w/types";
import { compact, EconomicClient, ref } from "../lib/client.ts";

interface Input {
  name: string;
  currency: string;
  customerGroupNumber: number;
  paymentTermsNumber: number;
  vatZoneNumber: number;
  customerNumber?: number;
  address?: string;
  zip?: string;
  city?: string;
  country?: string;
  email?: string;
  telephoneAndFaxNumber?: string;
  website?: string;
  corporateIdentificationNumber?: string;
  vatNumber?: string;
  ean?: string;
  publicEntryNumber?: string;
  creditLimit?: number;
  salesPersonNumber?: number;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description:
    "Create a customer. Name, currency, customer group, payment terms and VAT zone are required by e-conomic; list them with the matching List actions.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      required: true,
      hint: "ISO code, e.g. DKK.",
    },
    { key: "customerGroupNumber", label: "Customer group number", type: "number", required: true },
    { key: "paymentTermsNumber", label: "Payment terms number", type: "number", required: true },
    { key: "vatZoneNumber", label: "VAT zone number", type: "number", required: true },
    {
      key: "customerNumber",
      label: "Customer number",
      type: "number",
      hint: "Leave empty to let e-conomic assign the next number.",
    },
    { key: "address", label: "Address", type: "string" },
    { key: "zip", label: "Postcode", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "country", label: "Country", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "telephoneAndFaxNumber", label: "Telephone / fax", type: "string" },
    { key: "website", label: "Website", type: "string" },
    { key: "corporateIdentificationNumber", label: "Corporate ID (CVR)", type: "string" },
    { key: "vatNumber", label: "VAT number", type: "string" },
    { key: "ean", label: "EAN", type: "string" },
    { key: "publicEntryNumber", label: "Public entry number", type: "string" },
    { key: "creditLimit", label: "Credit limit", type: "number" },
    { key: "salesPersonNumber", label: "Sales person (employee number)", type: "number" },
  ],
  output: [
    { key: "customerNumber", type: "number", label: "Customer number" },
    { key: "customer", type: "object", label: "Created customer" },
  ],
  async execute(input, ctx) {
    const customer = await new EconomicClient(ctx).request<{ customerNumber?: number }>(
      "POST",
      "/customers",
      {
        body: compact({
          customerNumber: input.customerNumber,
          name: input.name,
          currency: input.currency,
          customerGroup: ref("customerGroupNumber", input.customerGroupNumber),
          paymentTerms: ref("paymentTermsNumber", input.paymentTermsNumber),
          vatZone: ref("vatZoneNumber", input.vatZoneNumber),
          address: input.address,
          zip: input.zip,
          city: input.city,
          country: input.country,
          email: input.email,
          telephoneAndFaxNumber: input.telephoneAndFaxNumber,
          website: input.website,
          corporateIdentificationNumber: input.corporateIdentificationNumber,
          vatNumber: input.vatNumber,
          ean: input.ean,
          publicEntryNumber: input.publicEntryNumber,
          creditLimit: input.creditLimit,
          salesPerson: ref("employeeNumber", input.salesPersonNumber),
        }),
      },
    );
    return { customerNumber: customer.customerNumber, customer };
  },
};

export default customerCreate;
