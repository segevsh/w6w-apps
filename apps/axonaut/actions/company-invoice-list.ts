import type { ActionDefinition } from "@w6w/types";
import { AxonautClient, encodeId } from "../lib/client.ts";

/**
 * `GET /api/v2/companies/{companyId}/invoices` — List the invoices of one company.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  companyId: number;
  page?: number;
  is_paid?: boolean;
  date_after?: string;
}

const companyInvoiceList: ActionDefinition<Input> = {
  key: "company-invoice-list",
  type: "search",
  resource: "invoice",
  title: "List Company Invoices",
  description: "List the invoices of one company.",
  params: [
    {
      key: "companyId",
      label: "Company ID",
      type: "number",
      required: true,
      hint: "Numeric Axonaut id of the company.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint:
        "Page number, sent as the `page` header (1-based). The list ends at the first empty page.",
    },
    { key: "is_paid", label: "Paid", type: "boolean", hint: "Filter paid or unpaid." },
    { key: "date_after", label: "Date after", type: "string", hint: "ISO 8601 date." },
  ],
  output: [
    { key: "items", type: "array", label: "Records on this page" },
    { key: "count", type: "number", label: "Records on this page" },
    { key: "page", type: "number", label: "Page requested" },
    { key: "nextPage", type: "number", label: "Next page number, null when this page was empty" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).many(`/companies/${encodeId(input.companyId)}/invoices`, {
      query: { "is_paid": input.is_paid, "date_after": input.date_after },
      page: input.page,
    });
  },
};

export default companyInvoiceList;
