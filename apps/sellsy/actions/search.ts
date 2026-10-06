import { coerce, define } from "../lib/actions.ts";
import { call } from "../lib/client.ts";

/** `GET /search?q=` (scope `search.read`) — one query across companies, individuals, contacts, opportunities and more. */
export default define(
  {
    key: "search",
    type: "search",
    title: "Search Everything",
    description:
      "Full-text search across companies, individuals, contacts, opportunities and documents with one query. Needs the `search.read` scope.",
  },
  [
    { key: "q", label: "Query", required: true },
    {
      key: "type",
      label: "Type",
      hint:
        "Restrict to one object type, e.g. company, company.client, individual, contact, opportunity.",
    },
    { key: "limit", label: "Limit", as: "int", type: "number", default: 25, hint: "1–100." },
    { key: "archived", label: "Include archived", as: "bool" },
  ],
  [
    { key: "data", type: "json", label: "Matches" },
    { key: "pagination", type: "json", label: "limit, count, total" },
    { key: "aggregations", type: "json", label: "Match count by type" },
  ],
  async (input, ctx) => {
    const limit = coerce("limit", input.limit, "int") as number | undefined;
    if (limit !== undefined && (limit < 1 || limit > 100)) {
      throw new Error("limit must be between 1 and 100");
    }
    const body = await call(ctx, "/search", {
      query: {
        q: String(input.q),
        type: input.type ? String(input.type) : undefined,
        limit: limit ?? 25,
        archived: coerce("archived", input.archived, "bool") as boolean | undefined,
      },
    }) as Record<string, unknown> | null;
    return {
      data: body?.data ?? [],
      pagination: body?.pagination ?? null,
      aggregations: body?.aggregations ?? null,
    };
  },
);
