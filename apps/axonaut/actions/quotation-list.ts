import type { ActionDefinition } from "@w6w/types";
import { AxonautClient } from "../lib/client.ts";

/**
 * `GET /api/v2/quotations` — List quotations, optionally filtered by status, company or date.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  page?: number;
  status?: string;
  sort?: string;
  company_id?: number;
  date_before?: string;
  date_after?: string;
}

const quotationList: ActionDefinition<Input> = {
  key: "quotation-list",
  type: "search",
  resource: "quotation",
  title: "List Quotations",
  description: "List quotations, optionally filtered by status, company or date.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint:
        "Page number, sent as the `page` header (1-based). The list ends at the first empty page.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "accepted", label: "accepted" }, { value: "refused", label: "refused" }, {
        value: "pending",
        label: "pending",
      }, { value: "all", label: "all" }],
      hint: "Quotation status filter.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      options: [{ value: "id", label: "id" }, { value: "updatetime", label: "updatetime" }],
      hint: "Order of the returned data.",
    },
    { key: "company_id", label: "Company ID", type: "number", hint: "Company filter." },
    { key: "date_before", label: "Date before", type: "string", hint: "ISO 8601 date." },
    { key: "date_after", label: "Date after", type: "string", hint: "ISO 8601 date." },
  ],
  output: [
    { key: "items", type: "array", label: "Records on this page" },
    { key: "count", type: "number", label: "Records on this page" },
    { key: "page", type: "number", label: "Page requested" },
    { key: "nextPage", type: "number", label: "Next page number, null when this page was empty" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).many(`/quotations`, {
      query: {
        "status": input.status,
        "sort": input.sort,
        "company_id": input.company_id,
        "date_before": input.date_before,
        "date_after": input.date_after,
      },
      page: input.page,
    });
  },
};

export default quotationList;
