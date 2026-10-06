import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, compact, company } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

interface Input {
  companyId: string;
  query: string;
  match?: string;
  sort?: string;
  pageSize?: number;
  page?: number;
  archived?: boolean;
}

interface Envelope {
  total?: number;
  total_capped?: boolean;
  page?: number;
  page_size?: number;
  next_page?: number | null;
  data?: unknown[];
}

/**
 * `POST /company/{id}/candidates/search` — free-text search over the same index as the in-app
 * search box. Eventually consistent: a candidate created a moment ago may be missing (use Find
 * Candidate by Email for that). Results follow the token owner's access. Quoted phrases,
 * AND/OR/NOT and a trailing `*` are understood; a leading wildcard, an unbalanced quote or a
 * query that starts or ends with an operator is a 400.
 */
const candidateSearch: ActionDefinition<Input> = {
  key: "candidate-search",
  type: "search",
  resource: "candidate",
  title: "Search Candidates",
  description:
    "Free-text search across every candidate in the company (name, email, phone, headline, tags, work history, answers…).",
  params: [
    companyIdParam,
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      hint: 'Terms, "quoted phrases", AND / OR / NOT and a trailing * for prefix match.',
    },
    {
      key: "match",
      label: "Match",
      type: "select",
      default: "prefix",
      options: [
        { value: "prefix", label: "Prefix (the in-app behaviour)" },
        { value: "exact", label: "Exact" },
      ],
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      options: [
        { value: "relevance", label: "Relevance" },
        { value: "updated", label: "Recently updated" },
        { value: "created", label: "Recently created" },
      ],
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      validation: { min: 1, max: 50, integer: true },
    },
    { key: "page", label: "Page", type: "number", validation: { min: 1, integer: true } },
    { key: "archived", label: "Archived candidates", type: "boolean" },
  ],
  output: [
    { key: "candidates", type: "array", label: "Matches on this page" },
    { key: "total", type: "number", label: "Total matches" },
    { key: "totalCapped", type: "boolean", label: "True when the total was capped" },
    { key: "nextPage", type: "number", label: "Next page, when there is one" },
  ],

  async execute(input, ctx) {
    const body = await new BreezyClient(ctx).request<Envelope>(
      "POST",
      `${company(input.companyId)}/candidates/search`,
      {
        body: compact({
          query: input.query,
          match: input.match || undefined,
          sort: input.sort || undefined,
          page_size: input.pageSize,
          page: input.page,
          archived: input.archived,
        }),
      },
    );
    return {
      candidates: body.data ?? [],
      total: body.total,
      totalCapped: body.total_capped,
      ...(typeof body.next_page === "number" ? { nextPage: body.next_page } : {}),
    };
  },
};

export default candidateSearch;
