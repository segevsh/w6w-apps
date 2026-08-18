import type { ActionDefinition } from "@w6w/types";
import { csv, MixpanelClient, queryDate } from "../lib/client.ts";
import { DATE_RANGE_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/query/stream/query` — one person's event stream.
 *
 * Everything a named user did, in order, over a date range. This is the query
 * to run when the question is about *somebody* rather than about a metric: what
 * did this account do before they churned, what did the customer who filed this
 * ticket actually see, did the onboarding flow complete for this user.
 *
 * `distinct_ids` is a **JSON array encoded into a query parameter** — Mixpanel's
 * own shape, and easy to get wrong by passing a bare id. This action takes a
 * comma-separated list and encodes it.
 */
const action: ActionDefinition = {
  key: "activity-list",
  type: "read",
  resource: "profile",
  title: "List a user's activity",
  description:
    "One or more users' events in order over a date range — the query for 'what did this " +
    "person actually do', rather than a metric.",
  params: [
    {
      key: "distinctIds",
      label: "Distinct IDs",
      type: "string",
      required: true,
      default: "",
      placeholder: "user-1,user-2",
      hint: "Comma-separated. Sent as the JSON array Mixpanel expects.",
    },
    ...DATE_RANGE_PARAMS,
  ],
  output: [
    { key: "results", type: "object", label: "Events" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const ids = csv(p.distinctIds);
    if (!ids) throw new Error("`distinctIds` is required");
    const from = queryDate(p.fromDate, "fromDate");
    const to = queryDate(p.toDate, "toDate");
    if (!from || !to) throw new Error("`fromDate` and `toDate` are both required");

    return await new MixpanelClient(ctx).request("/api/query/stream/query", {
      query: {
        // A JSON array inside a query parameter — Mixpanel's shape.
        distinct_ids: JSON.stringify(ids),
        from_date: from,
        to_date: to,
      },
    });
  },
};

export default action;
