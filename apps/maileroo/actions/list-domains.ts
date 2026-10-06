import type { ActionDefinition } from "@w6w/types";
import { MailerooClient, pageInfo } from "../lib/client.ts";

interface Input {
  search?: string;
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortDir?: string;
}

const SORT = ["id", "domain_name", "delivered", "bounced", "opened", "clicked"];

/** `GET /v1/domains` (scope `domains.read`). */
const listDomains: ActionDefinition<Input> = {
  key: "list-domains",
  type: "search",
  resource: "domain",
  title: "List Domains",
  description: "List the account's sending domains with basic delivered / bounced / opened / " +
    "clicked statistics and DNS verification status. Account API Key (domains.read).",
  params: [
    { key: "search", label: "Search", type: "string", hint: "Filter by domain name." },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { min: 1, integer: true },
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: 25,
      validation: { min: 10, max: 100, integer: true },
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: SORT.map((v) => ({ value: v, label: v })),
    },
    {
      key: "sortDir",
      label: "Direction",
      type: "select",
      options: [{ value: "asc", label: "asc" }, { value: "desc", label: "desc" }],
    },
  ],
  output: [
    { key: "domains", type: "array", label: "Domains: id, domain_name, statistics, status" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Page size" },
    { key: "total", type: "number", label: "Total domains" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "hasMore", type: "boolean", label: "Another page follows" },
  ],

  async execute(input, ctx) {
    const { data } = await new MailerooClient(ctx).account("/domains", {
      query: {
        search: input.search?.trim(),
        page: input.page,
        per_page: input.perPage,
        sort_by: input.sortBy,
        sort_dir: input.sortDir,
      },
    });
    const d = (data ?? {}) as Record<string, unknown>;
    return { domains: d.domains ?? [], ...pageInfo(d) };
  },
};

export default listDomains;
