import type { ActionDefinition } from "@w6w/types";
import { compact, csv, idRef, PrintavoClient } from "../lib/client.ts";
import { ORDER_DETAIL_FIELDS } from "../lib/fields.ts";

interface Input {
  nickname?: string;
  visualPoNumber?: string;
  customerNote?: string;
  productionNote?: string;
  customerDueAt: string;
  dueAt: string;
  startAt?: string;
  invoiceAt?: string;
  paymentDueAt?: string;
  discount?: number;
  discountAsPercentage?: boolean;
  salesTax?: number;
  tags?: string;
  contactId: string;
  ownerId?: string;
  paymentTermId?: string;
  deliveryMethodId?: string;
  billingAddress?: unknown;
  shippingAddress?: unknown;
}

const quoteCreate: ActionDefinition<Input> = {
  key: "quote-create",
  type: "perform",
  resource: "quote",
  title: "Create Quote",
  description:
    "Create a quote for a customer contact (quoteCreate). Line item groups, fees and production files are not exposed by this action.",
  idempotent: false,
  params: [
    { key: "nickname", label: "Nickname", type: "string" },
    { key: "visualPoNumber", label: "PO Number", type: "string" },
    { key: "customerNote", label: "Customer Note", type: "text" },
    { key: "productionNote", label: "Production Note", type: "text" },
    {
      key: "customerDueAt",
      label: "Customer Due Date",
      type: "string",
      required: true,
      hint: "ISO 8601 date, e.g. 2026-11-01.",
    },
    {
      key: "dueAt",
      label: "Production Due",
      type: "string",
      required: true,
      hint: "ISO 8601 datetime.",
    },
    { key: "startAt", label: "Start", type: "string", hint: "ISO 8601 datetime." },
    { key: "invoiceAt", label: "Invoice Date", type: "string", hint: "ISO 8601 date." },
    { key: "paymentDueAt", label: "Payment Due Date", type: "string", hint: "ISO 8601 date." },
    { key: "discount", label: "Discount", type: "number" },
    { key: "discountAsPercentage", label: "Discount Is Percentage", type: "boolean" },
    { key: "salesTax", label: "Sales Tax (%)", type: "number" },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated." },
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "The customer contact the quote is for.",
    },
    { key: "ownerId", label: "Owner User ID", type: "string" },
    { key: "paymentTermId", label: "Payment Term ID", type: "string" },
    { key: "deliveryMethodId", label: "Delivery Method ID", type: "string" },
    {
      key: "billingAddress",
      label: "Billing Address",
      type: "json",
      hint:
        'CustomerAddressInput JSON: {"companyName","customerName","address1","address2","city","stateIso","zipCode","countryIso"}.',
    },
    {
      key: "shippingAddress",
      label: "Shipping Address",
      type: "json",
      hint:
        'CustomerAddressInput JSON: {"companyName","customerName","address1","address2","city","stateIso","zipCode","countryIso"}.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Quote ID" },
    { key: "visualId", type: "string", label: "Quote #" },
    { key: "publicUrl", type: "string", label: "Public URL" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ quoteCreate: unknown }>(
      `mutation($input: QuoteCreateInput!) { quoteCreate(input: $input) { ${ORDER_DETAIL_FIELDS} } }`,
      {
        input: compact({
          nickname: input.nickname,
          visualPoNumber: input.visualPoNumber,
          customerNote: input.customerNote,
          productionNote: input.productionNote,
          customerDueAt: input.customerDueAt,
          dueAt: input.dueAt,
          startAt: input.startAt,
          invoiceAt: input.invoiceAt,
          paymentDueAt: input.paymentDueAt,
          discount: input.discount,
          discountAsPercentage: input.discountAsPercentage,
          salesTax: input.salesTax,
          tags: csv(input.tags),
          contact: idRef(input.contactId),
          owner: idRef(input.ownerId),
          paymentTerm: idRef(input.paymentTermId),
          deliveryMethod: idRef(input.deliveryMethodId),
          billingAddress: input.billingAddress,
          shippingAddress: input.shippingAddress,
        }),
      },
    );
    return data.quoteCreate;
  },
};

export default quoteCreate;
