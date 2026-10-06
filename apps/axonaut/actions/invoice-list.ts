import type { ActionDefinition } from "@w6w/types";
import { AxonautClient } from "../lib/client.ts";

/**
 * `GET /api/v2/invoices` — List invoices, optionally for one company and filtered by date or paid state.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  page?: number;
  number?: string;
  internal_ref?: string;
  date_before?: string;
  date_after?: string;
  paid_date?: string;
  is_paid?: boolean;
  updated_after?: string;
}

const invoiceList: ActionDefinition<Input> = {
  key: "invoice-list",
  type: "search",
  resource: "invoice",
  title: "List Invoices",
  description: "List invoices, optionally for one company and filtered by date or paid state.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint:
        "Page number, sent as the `page` header (1-based). The list ends at the first empty page.",
    },
    { key: "number", label: "Number", type: "string", hint: "Invoice number." },
    { key: "internal_ref", label: "Internal ref", type: "string", hint: "Internal reference." },
    { key: "date_before", label: "Date before", type: "string", hint: "ISO 8601 date." },
    { key: "date_after", label: "Date after", type: "string", hint: "ISO 8601 date." },
    { key: "paid_date", label: "Paid date", type: "string", hint: "ISO 8601 date." },
    { key: "is_paid", label: "Paid", type: "boolean", hint: "Filter paid or unpaid." },
    { key: "updated_after", label: "Updated after", type: "string", hint: "ISO 8601 date." },
  ],
  output: [
    { key: "items", type: "array", label: "Records on this page" },
    { key: "count", type: "number", label: "Records on this page" },
    { key: "page", type: "number", label: "Page requested" },
    { key: "nextPage", type: "number", label: "Next page number, null when this page was empty" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).many(`/invoices`, {
      query: {
        "number": input.number,
        "internal_ref": input.internal_ref,
        "date_before": input.date_before,
        "date_after": input.date_after,
        "paid_date": input.paid_date,
        "is_paid": input.is_paid,
        "updated_after": input.updated_after,
      },
      page: input.page,
    });
  },
};

export default invoiceList;
