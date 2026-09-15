import type { ActionDefinition } from "@w6w/types";
import { MocoClient } from "../lib/client.ts";
import { pagination, updatedAfter } from "../lib/params.ts";

interface Input {
  status?: string;
  companyId?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  term?: string;
  identifier?: string;
  page?: number;
  perPage?: number;
  updatedAfter?: string;
}

/**
 * `GET /invoices` — verified against `docs.mocoapp.com/api/docs/v1.yaml`. Excludes
 * `disregarded` invoices by default, and list items omit detail fields (`items`, `payments`,
 * `reminders`) — use "Get Invoice" for the full record.
 */
const invoiceList: ActionDefinition<Input> = {
  key: "invoice-list",
  type: "search",
  resource: "invoice",
  title: "List Invoices",
  description: "List invoices. Use the filters to narrow the set.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "string",
      hint:
        "Comma-separated: draft, created, sent, partially_paid, paid, overdue, ignored, disregarded.",
    },
    {
      key: "companyId",
      label: "Customer company ID",
      type: "string",
      hint: "Single ID or comma-separated.",
    },
    { key: "projectId", label: "Project ID", type: "string", advanced: true },
    { key: "dateFrom", label: "Invoice date from", type: "date", row: "range" },
    { key: "dateTo", label: "Invoice date to", type: "date", row: "range" },
    { key: "term", label: "Search term", type: "string", advanced: true },
    { key: "identifier", label: "Identifier", type: "string", advanced: true },
    updatedAfter,
    ...pagination,
  ],
  output: [
    { key: "invoices", type: "array", label: "Invoices" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Entries per page" },
    { key: "total", type: "number", label: "Total records" },
  ],

  async execute(input, ctx) {
    const { items, page } = await new MocoClient(ctx).list("/invoices", {
      query: {
        status: input.status,
        company_id: input.companyId,
        project_id: input.projectId,
        date_from: input.dateFrom,
        date_to: input.dateTo,
        term: input.term,
        identifier: input.identifier,
        updated_after: input.updatedAfter,
        page: input.page,
        per_page: input.perPage,
      },
    });
    return { invoices: items, page: page.page, perPage: page.perPage, total: page.total };
  },
};

export default invoiceList;
