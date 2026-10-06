import type { ActionDefinition } from "@w6w/types";
import { compact, idRef, PrintavoClient } from "../lib/client.ts";
import { CUSTOMER_FIELDS } from "../lib/fields.ts";

interface Input {
  id: string;
  companyName?: string;
  internalNote?: string;
  resaleNumber?: string;
  salesTax?: number;
  taxExempt?: boolean;
  ownerId?: string;
  billingAddress?: unknown;
  shippingAddress?: unknown;
}

const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description:
    "Update a customer's company-level fields (customerUpdate); only the fields you set are sent.",
  idempotent: true,
  params: [
    { key: "id", label: "Customer ID", type: "string", required: true },
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
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ customerUpdate: unknown }>(
      `mutation($id: ID!, $input: CustomerInput!) { customerUpdate(id: $id, input: $input) { ${CUSTOMER_FIELDS} } }`,
      {
        id: input.id,
        input: compact({
          companyName: input.companyName,
          internalNote: input.internalNote,
          resaleNumber: input.resaleNumber,
          salesTax: input.salesTax,
          taxExempt: input.taxExempt,
          owner: idRef(input.ownerId),
          billingAddress: input.billingAddress,
          shippingAddress: input.shippingAddress,
        }),
      },
    );
    return data.customerUpdate;
  },
};

export default customerUpdate;
