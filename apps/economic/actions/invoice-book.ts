import type { ActionDefinition } from "@w6w/types";
import { compact, EconomicClient } from "../lib/client.ts";

interface Input {
  draftInvoiceNumber: number;
  bookWithNumber?: number;
  sendBy?: string;
}

const invoiceBook: ActionDefinition<Input> = {
  key: "invoice-book",
  type: "perform",
  resource: "invoice",
  title: "Book Invoice",
  description:
    "Book a draft invoice, making it a booked (final, numbered) invoice, and optionally send it to the recipient. Not reversible through the API.",
  idempotent: false,
  params: [
    { key: "draftInvoiceNumber", label: "Draft invoice number", type: "number", required: true },
    {
      key: "bookWithNumber",
      label: "Book with number",
      type: "number",
      hint: "Force a specific booked invoice number; otherwise the next one is used.",
    },
    {
      key: "sendBy",
      label: "Send by",
      type: "select",
      options: [
        { value: "none", label: "Do not send" },
        { value: "ean", label: "EAN (e-invoice)" },
        { value: "Email", label: "Email" },
      ],
      hint: "Defaults to not sending.",
    },
  ],
  output: [
    { key: "bookedInvoiceNumber", type: "number", label: "Booked invoice number" },
    { key: "invoice", type: "object", label: "Booked invoice" },
  ],
  async execute(input, ctx) {
    const invoice = await new EconomicClient(ctx).request<{ bookedInvoiceNumber?: number }>(
      "POST",
      "/invoices/booked",
      {
        body: compact({
          draftInvoice: { draftInvoiceNumber: input.draftInvoiceNumber },
          bookWithNumber: input.bookWithNumber,
          sendBy: input.sendBy || undefined,
        }),
      },
    );
    return { bookedInvoiceNumber: invoice.bookedInvoiceNumber, invoice };
  },
};

export default invoiceBook;
