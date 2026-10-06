import type { ActionDefinition } from "@w6w/types";
import { listOf, request, V1 } from "../lib/client.ts";
import { bool, int, select, str } from "../lib/params.ts";

type Input = {
  search: string;
  campaigns_details?: boolean;
  status?: string;
  interested?: string;
  diff?: string;
  page?: number;
  per_page?: number;
  sort?: string;
};

const prospectSearch: ActionDefinition<Input> = {
  key: "prospect-search",
  type: "search",
  resource: "prospect",
  title: "Search Prospects",
  description:
    "Search prospects by field values (email, name, company, tags, snippets, ...), with the campaigns each belongs to.",
  params: [
    str("search", "Search", {
      required: true,
      hint:
        "Comma-separated field=value pairs, for example email=erlich@bachman.com,company=Bachmanity. An email without @domain matches as a substring.",
    }),
    bool("campaigns_details", "Include campaign details", { default: true }),
    select("status", "Status", ["ACTIVE", "BOUNCED", "REPLIED", "BLACKLIST", "INVALID"], {
      hint:
        "Global status; with campaign IDs it is the campaign status (adds TO-CHECK, TO-REVIEW, AUTOREPLIED, PAUSED).",
    }),
    select("interested", "Interest level", [
      "INTERESTED",
      "MAYBE-LATER",
      "NOT-INTERESTED",
      "NOT-MARKED",
    ]),
    str("diff", "Changed since", {
      hint: "Timestamp after which activity changed, e.g. 2025-01-15T00:00:00+0200.",
    }),
    int("page", "Page", { hint: "1-based page number." }),
    int("per_page", "Per page", { hint: "Vendor default 100, maximum 1000." }),
    str("sort", "Sort", {
      hint: "+column or -column, comma-separated. Example: +company,-last_contacted.",
    }),
  ],
  output: [
    {
      key: "prospects",
      type: "array",
      label:
        "Prospects: id, email, first_name, last_name, company, status, snippets, last_contacted, ...",
    },
    { key: "count", type: "number", label: "Prospects on this page" },
    {
      key: "total",
      type: "number",
      label: "X-Total-Count: all prospects matching (null when the vendor sends none)",
    },
    { key: "message", type: "string", label: "Vendor message when nothing matches" },
  ],

  async execute(input, ctx) {
    const reply = await request(ctx, "GET", V1, "/prospects", {
      query: {
        search: input.search,
        campaigns_details: input.campaigns_details ?? true,
        status: input.status,
        interested: input.interested,
        diff: input.diff,
        page: input.page,
        per_page: input.per_page,
        sort: input.sort,
      },
    });
    const { items, message } = listOf(reply.body);
    const total = Number(reply.headers.get("x-total-count"));
    return {
      prospects: items,
      count: items.length,
      total: reply.headers.get("x-total-count") === null || Number.isNaN(total) ? null : total,
      ...(message ? { message } : {}),
    };
  },
};

export default prospectSearch;
