import type { ActionDefinition } from "@w6w/types";
import { callList, encodeId, parseJson } from "../lib/client.ts";
import { analyticsNetworks, blogId, json, select, str } from "../lib/params.ts";

type Input = {
  blogId: string;
  network: string;
  from: string;
  to: string;
  timezone: string;
  limit: string;
  competitors?: unknown;
};

/** `GET /v2/analytics/competitors/{network}`. */
const competitorList: ActionDefinition<Input> = {
  key: "competitor-list",
  type: "read",
  resource: "competitor",
  title: "List Competitors",
  description: "A brand's competitors on one network, with follower and engagement figures.",
  params: [
    blogId,
    select("network", "Network", analyticsNetworks, { required: true }),
    str("from", "From", { required: true, hint: "ISO 8601, e.g. 2026-01-01T00:00:00+01:00." }),
    str("to", "To", { required: true, hint: "ISO 8601, e.g. 2026-01-31T23:59:59+01:00." }),
    str("timezone", "Timezone", { required: true, hint: "IANA timezone, e.g. Europe/Madrid." }),
    str("limit", "Limit", { required: true, hint: "Maximum number of competitors." }),
    json("competitors", "Competitor IDs", {
      hint: "Optional array of competitor ids to restrict to.",
    }),
  ],
  output: [
    { key: "items", type: "array", label: "Competitors: {id, screenName, followers, posts, …}" },
    { key: "count", type: "number", label: "Number of competitors" },
  ],

  execute(input, ctx) {
    const ids = parseJson(input.competitors, "competitors");
    return callList(ctx, `/v2/analytics/competitors/${encodeId(input.network)}`, {
      blogId: input.blogId,
      query: {
        from: input.from,
        to: input.to,
        timezone: input.timezone,
        limit: input.limit,
        "competitors[]": Array.isArray(ids) ? ids.map(String) : undefined,
      },
    });
  },
};

export default competitorList;
