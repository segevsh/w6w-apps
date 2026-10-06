import type { ActionDefinition } from "@w6w/types";
import { compact, csv, idRef, PrintavoClient } from "../lib/client.ts";
import { ORDER_DETAIL_FIELDS } from "../lib/fields.ts";

interface Input {
  id: string;
  nickname?: string;
  visualPoNumber?: string;
  customerNote?: string;
  productionNote?: string;
  customerDueAt?: string;
  dueAt?: string;
  startAt?: string;
  invoiceAt?: string;
  paymentDueAt?: string;
  discount?: number;
  discountAsPercentage?: boolean;
  salesTax?: number;
  tags?: string;
  contactId?: string;
  ownerId?: string;
  paymentTermId?: string;
  deliveryMethodId?: string;
  billingAddress?: unknown;
  shippingAddress?: unknown;
}

const quoteUpdate: ActionDefinition<Input> = {
  key: "quote-update",
  type: "perform",
  resource: "quote",
  title: "Update Quote",
  description:
    "Update a quote (`quoteUpdate`); only the fields you set are sent. Use Set Order Status to change its status.",
  idempotent: true,
  params: [
    { key: "id", label: "Quote ID", type: "string", required: true },
    { key: "nickname", label: "Nickname", type: "string" },
    { key: "visualPoNumber", label: "PO Number", type: "string" },
    { key: "customerNote", label: "Customer Note", type: "text" },
    { key: "productionNote", label: "Production Note", type: "text" },
    {
      key: "customerDueAt",
      label: "Customer Due Date",
      type: "string",
      hint: "ISO 8601 date, e.g. 2026-11-01.",
    },
    { key: "dueAt", label: "Production Due", type: "string", hint: "ISO 8601 datetime." },
    { key: "startAt", label: "Start", type: "string", hint: "ISO 8601 datetime." },
    { key: "invoiceAt", label: "Invoice Date", type: "string", hint: "ISO 8601 date." },
    { key: "paymentDueAt", label: "Payment Due Date", type: "string", hint: "ISO 8601 date." },
    { key: "discount", label: "Discount", type: "number" },
    { key: "discountAsPercentage", label: "Discount Is Percentage", type: "boolean" },
    { key: "salesTax", label: "Sales Tax (%)", type: "number" },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated." },
    { key: "contactId", label: "Contact ID", type: "string" },
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
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ quoteUpdate: unknown }>(
      `mutation($id: ID!, $input: QuoteInput!) { quoteUpdate(id: $id, input: $input) { ${ORDER_DETAIL_FIELDS} } }`,
      {
        id: input.id,
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
    return data.quoteUpdate;
  },
};

export default quoteUpdate;
