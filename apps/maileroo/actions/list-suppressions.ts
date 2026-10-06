import type { ActionDefinition } from "@w6w/types";
import { MailerooClient, pageInfo } from "../lib/client.ts";

interface Input {
  search?: string;
  page?: number;
  perPage?: number;
}

/** `GET /v1/suppressions` (scope `suppressions.read`). */
const listSuppressions: ActionDefinition<Input> = {
  key: "list-suppressions",
  type: "search",
  resource: "suppression",
  title: "List Suppressions",
  description: "List suppressed email addresses (bounces, complaints, manual entries), " +
    "paginated and searchable. Account API Key (suppressions.read).",
  params: [
    { key: "search", label: "Search", type: "string", hint: "Filter by email address." },
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
  ],
  output: [
    { key: "suppressions", type: "array", label: "id, email_address, reason" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Page size" },
    { key: "total", type: "number", label: "Total suppressions" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "hasMore", type: "boolean", label: "Another page follows" },
  ],

  async execute(input, ctx) {
    const { data } = await new MailerooClient(ctx).account("/suppressions", {
      query: { search: input.search?.trim(), page: input.page, per_page: input.perPage },
    });
    const d = (data ?? {}) as Record<string, unknown>;
    return { suppressions: d.suppressions ?? [], ...pageInfo(d) };
  },
};

export default listSuppressions;
