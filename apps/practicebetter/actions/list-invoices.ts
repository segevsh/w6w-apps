import type { ActionDefinition } from "@w6w/types";
import {
  type Page,
  type PageInput,
  pageOutput,
  pageParams,
  pageQuery,
  PracticeBetterClient,
  toList,
} from "../lib/client.ts";

/**
 * `GET /consultant/payments/invoices` — list invoices.
 *
 * Security: `[read]`. Pagination is the shared four-control shape every list
 * endpoint here declares (see `lib/client.ts`).
 *
 * `paymentstatus` is typed in the document as an array of
 * `InvoicePaymentStatus` `{name, value}` pairs; the names themselves are not
 * published, so this action takes them as free text (sent as repeated query
 * keys). The `invoicedate_*` window is separate from any `dateModified` window
 * because an invoice's own date is what a billing reconciliation filters on.
 *
 * This app reads invoices; it never writes them. The document exposes payments,
 * refunds and write-offs under the same `/consultant/payments` prefix, and none
 * of them is in scope here.
 */
interface Input extends PageInput {
  consultants?: string[] | string;
  records?: string[] | string;
  paymentstatus?: string[] | string;
  invoicedate_eq?: string;
  invoicedate_gte?: string;
  invoicedate_lte?: string;
}

const listInvoices: ActionDefinition<Input, Page<unknown>> = {
  key: "list-invoices",
  type: "search",
  resource: "invoice",
  title: "List Invoices",
  description:
    "List invoices, filtered by consultant, client record, payment status and invoice-date window.",
  params: [
    ...pageParams,
    {
      key: "consultants",
      label: "Consultants",
      type: "multiselect",
      hint: "One or more consultant ids.",
    },
    {
      key: "records",
      label: "Client records",
      type: "multiselect",
      hint: "One or more client record ids.",
    },
    {
      key: "paymentstatus",
      label: "Payment statuses",
      type: "multiselect",
      hint:
        "One or more `InvoicePaymentStatus` names. The document does not publish the name list, so " +
        "they are typed by hand; each is sent as a repeated `paymentstatus` query key.",
    },
    {
      key: "invoicedate_eq",
      label: "Invoice date",
      type: "datetime",
      hint: "Exact invoice date (date-time).",
    },
    {
      key: "invoicedate_gte",
      label: "Invoice date on or after",
      type: "datetime",
      hint: "Lower bound on the invoice date (date-time).",
    },
    {
      key: "invoicedate_lte",
      label: "Invoice date on or before",
      type: "datetime",
      hint: "Upper bound on the invoice date (date-time).",
    },
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new PracticeBetterClient(ctx).list("/consultant/payments/invoices", {
      query: {
        ...pageQuery(input),
        consultants: toList(input.consultants),
        records: toList(input.records),
        paymentstatus: toList(input.paymentstatus),
        invoicedate_eq: input.invoicedate_eq,
        invoicedate_gte: input.invoicedate_gte,
        invoicedate_lte: input.invoicedate_lte,
      },
    });
  },
};

export default listInvoices;
