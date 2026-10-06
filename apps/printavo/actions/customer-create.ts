import type { ActionDefinition } from "@w6w/types";
import { compact, csv, idRef, PrintavoClient } from "../lib/client.ts";
import { CUSTOMER_FIELDS } from "../lib/fields.ts";

interface Input {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  fax?: string;
  companyName?: string;
  internalNote?: string;
  resaleNumber?: string;
  salesTax?: number;
  taxExempt?: boolean;
  ownerId?: string;
  billingAddress?: unknown;
  shippingAddress?: unknown;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer with its required primary contact (customerCreate).",
  idempotent: false,
  params: [
    { key: "firstName", label: "Primary Contact First Name", type: "string" },
    { key: "lastName", label: "Primary Contact Last Name", type: "string" },
    { key: "email", label: "Primary Contact Email(s)", type: "string", hint: "Comma-separated." },
    { key: "phone", label: "Primary Contact Phone", type: "string" },
    { key: "fax", label: "Primary Contact Fax", type: "string" },
    { key: "companyName", label: "Company Name", type: "string" },
    { key: "internalNote", label: "Internal Note", type: "text" },
    { key: "resaleNumber", label: "Resale Number", type: "string" },
    { key: "salesTax", label: "Sales Tax (%)", type: "number" },
    { key: "taxExempt", label: "Tax Exempt", type: "boolean" },
    { key: "ownerId", label: "Owner User ID", type: "string" },
    {
      key: "billingAddress",
      label: "Billing Address",
      type: "json",
      hint: 'AddressInput JSON: {"address1","address2","city","stateIso","zipCode","countryIso"}.',
    },
    {
      key: "shippingAddress",
      label: "Shipping Address",
      type: "json",
      hint: 'AddressInput JSON: {"address1","address2","city","stateIso","zipCode","countryIso"}.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Customer ID" },
    { key: "companyName", type: "string", label: "Company Name" },
    { key: "primaryContact", type: "object", label: "Primary Contact" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ customerCreate: unknown }>(
      `mutation($input: CustomerCreateInput!) { customerCreate(input: $input) { ${CUSTOMER_FIELDS} } }`,
      {
        input: compact({
          companyName: input.companyName,
          internalNote: input.internalNote,
          resaleNumber: input.resaleNumber,
          salesTax: input.salesTax,
          taxExempt: input.taxExempt,
          owner: idRef(input.ownerId),
          billingAddress: input.billingAddress,
          shippingAddress: input.shippingAddress,
          primaryContact: compact({
            firstName: input.firstName,
            lastName: input.lastName,
            email: csv(input.email),
            phone: input.phone,
            fax: input.fax,
          }),
        }),
      },
    );
    return data.customerCreate;
  },
};

export default customerCreate;
