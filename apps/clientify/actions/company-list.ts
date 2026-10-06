import type { ActionDefinition } from "@w6w/types";
import { asObject, ClientifyClient } from "../lib/client.ts";

/**
 * `GET /v1/companies/` — List or search companies. `query` matches company name and business name; created/modified date filters and taxpayer_identification_number go in `filters`.
 */
interface Input {
  query?: string;
  taxpayerIdentificationNumber?: string;
  page?: number;
  filters?: unknown;
}

const companyList: ActionDefinition<Input, unknown> = {
  key: "company-list",
  type: "search",
  resource: "company",
  title: "List Companies",
  description:
    "List or search companies. `query` matches company name and business name; created/modified date filters and taxpayer_identification_number go in `filters`.",
  params: [
    {
      key: "query",
      label: "Search",
      type: "string",
      hint: "Matches company name and business name.",
    },
    { key: "taxpayerIdentificationNumber", label: "Taxpayer ID", type: "string" },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based page number; Clientify returns at most 100 results per page.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "filters",
      label: "Extra filters",
      type: "json",
      hint:
        'Further query filters as a JSON object, e.g. {"created[gt]": "2024/01/01", "modified[lt]": "2024/02/01"}. Named parameters win on a clash.',
    },
  ],
  output: [
    { key: "count", type: "number", label: "Total matches" },
    { key: "next", type: "string", label: "URL of the next page, or null" },
    { key: "previous", type: "string", label: "URL of the previous page, or null" },
    { key: "results", type: "array", label: "Records on this page" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/companies/`, {
      method: "GET",
      query: {
        ...asObject(input.filters, "filters"),
        "query": input.query,
        "taxpayer_identification_number": input.taxpayerIdentificationNumber,
        "page": input.page,
      },
    });
  },
};

export default companyList;
