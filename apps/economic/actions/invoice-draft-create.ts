import type { ActionDefinition } from "@w6w/types";
import { compact, EconomicClient, jsonValue, ref } from "../lib/client.ts";

interface Input {
  customerNumber: number;
  date: string;
  currency: string;
  paymentTermsNumber: number;
  layoutNumber: number;
  recipientName: string;
  recipientVatZoneNumber: number;
  recipientAddress?: string;
  recipientZip?: string;
  recipientCity?: string;
  recipientCountry?: string;
  dueDate?: string;
  exchangeRate?: number;
  reference?: string;
  heading?: string;
  textLine1?: string;
  lines?: unknown;
}

const invoiceDraftCreate: ActionDefinition<Input> = {
  key: "invoice-draft-create",
  type: "perform",
  resource: "invoice",
  title: "Create Draft Invoice",
  description:
    "Create a draft invoice (it is not booked; use Book Invoice for that). e-conomic requires customer, date, currency, payment terms, layout and the recipient's name and VAT zone; Get Customer Invoice Template returns a pre-filled draft for a customer to copy those from.",
  idempotent: false,
  params: [
    { key: "customerNumber", label: "Customer number", type: "number", required: true },
    { key: "date", label: "Invoice date", type: "string", required: true, hint: "YYYY-MM-DD." },
    { key: "currency", label: "Currency", type: "string", required: true, hint: "ISO code." },
    { key: "paymentTermsNumber", label: "Payment terms number", type: "number", required: true },
    { key: "layoutNumber", label: "Layout number", type: "number", required: true },
    { key: "recipientName", label: "Recipient name", type: "string", required: true },
    { key: "recipientVatZoneNumber", label: "Recipient VAT zone", type: "number", required: true },
    { key: "recipientAddress", label: "Recipient address", type: "string" },
    { key: "recipientZip", label: "Recipient postcode", type: "string" },
    { key: "recipientCity", label: "Recipient city", type: "string" },
    { key: "recipientCountry", label: "Recipient country", type: "string" },
    { key: "dueDate", label: "Due date", type: "string", hint: "YYYY-MM-DD." },
    { key: "exchangeRate", label: "Exchange rate", type: "number" },
    {
      key: "reference",
      label: "Other reference",
      type: "string",
      hint: "Free-text reference line.",
    },
    { key: "heading", label: "Heading", type: "string", hint: "Text above the lines." },
    { key: "textLine1", label: "Text line 1", type: "string", hint: "Text below the lines." },
    {
      key: "lines",
      label: "Lines (JSON)",
      type: "json",
      hint:
        'Array of lines, e.g. [{"lineNumber":1,"sortKey":1,"description":"Consulting","product":{"productNumber":"1"},"quantity":2,"unitNetPrice":100,"unit":{"unitNumber":1},"discountPercentage":0}].',
    },
  ],
  output: [
    { key: "draftInvoiceNumber", type: "number", label: "Draft invoice number" },
    { key: "invoice", type: "object", label: "Created draft invoice" },
  ],
  async execute(input, ctx) {
    const notes = compact({ heading: input.heading, textLine1: input.textLine1 });
    const invoice = await new EconomicClient(ctx).request<{ draftInvoiceNumber?: number }>(
      "POST",
      "/invoices/drafts",
      {
        body: compact({
          date: input.date,
          dueDate: input.dueDate,
          currency: input.currency,
          exchangeRate: input.exchangeRate,
          customer: ref("customerNumber", input.customerNumber),
          paymentTerms: ref("paymentTermsNumber", input.paymentTermsNumber),
          layout: ref("layoutNumber", input.layoutNumber),
          recipient: compact({
            name: input.recipientName,
            address: input.recipientAddress,
            zip: input.recipientZip,
            city: input.recipientCity,
            country: input.recipientCountry,
            vatZone: ref("vatZoneNumber", input.recipientVatZoneNumber),
          }),
          references: input.reference ? { other: input.reference } : undefined,
          notes: Object.keys(notes).length ? notes : undefined,
          lines: jsonValue(input.lines),
        }),
      },
    );
    return { draftInvoiceNumber: invoice.draftInvoiceNumber, invoice };
  },
};

export default invoiceDraftCreate;
