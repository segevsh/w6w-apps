import type { ActionDefinition } from "@w6w/types";
import { csv, listOf, request, V1 } from "../lib/client.ts";
import { bool, int, select, str } from "../lib/params.ts";

type Input = {
  campaigns_id?: string;
  id?: string;
  status?: string;
  contacted?: boolean;
  interested?: string;
  activity?: string;
  diff?: string;
  page?: number;
  per_page?: number;
  sort?: string;
};

const prospectList: ActionDefinition<Input> = {
  key: "prospect-list",
  type: "read",
  resource: "prospect",
  title: "List Prospects",
  description:
    "List prospects in the account, optionally filtered by status, activity or change time, and optionally restricted to the campaigns they are enrolled in.",
  params: [
    str("campaigns_id", "Campaign IDs", {
      hint: "Comma-separated. When set, returns per-campaign rows with the campaign status.",
    }),
    str("id", "Prospect IDs", { hint: "Comma-separated prospect IDs." }),
    select("status", "Status", ["ACTIVE", "BOUNCED", "REPLIED", "BLACKLIST", "INVALID"], {
      hint:
        "Global status; with campaign IDs it is the campaign status (adds TO-CHECK, TO-REVIEW, AUTOREPLIED, PAUSED).",
    }),
    bool("contacted", "Contacted"),
    select("interested", "Interest level", [
      "INTERESTED",
      "MAYBE-LATER",
      "NOT-INTERESTED",
      "NOT-MARKED",
    ]),
    select("activity", "Activity", ["OPENED", "NOT-OPENED", "CLICKED", "NOT-CLICKED"]),
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
        campaigns_id: csv(input.campaigns_id),
        id: csv(input.id),
        status: input.status,
        contacted: input.contacted,
        interested: input.interested,
        activity: input.activity,
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

export default prospectList;
