import type { ActionDefinition } from "@w6w/types";
import { callList } from "../lib/client.ts";
import { blogId, str } from "../lib/params.ts";

type Input = { blogId: string; from: string; to: string; timezone?: string };

/** `GET /v2/analytics/brand-summary/posts`. */
const brandSummaryPostsList: ActionDefinition<Input> = {
  key: "brand-summary-posts-list",
  type: "read",
  resource: "analytics",
  title: "List Published Posts With Metrics",
  description: "A brand's published posts across all its networks in a period, each with metrics.",
  params: [
    blogId,
    str("from", "From", { required: true, hint: "ISO 8601, e.g. 2026-01-01T00:00:00+01:00." }),
    str("to", "To", { required: true, hint: "ISO 8601, e.g. 2026-01-31T23:59:59+01:00." }),
    str("timezone", "Timezone", { hint: "IANA timezone, e.g. Europe/Madrid." }),
  ],
  output: [
    {
      key: "items",
      type: "array",
      label: "Posts: {id, network, text, link, publicationDate, metrics}",
    },
    { key: "count", type: "number", label: "Number of posts" },
  ],

  execute(input, ctx) {
    return callList(ctx, "/v2/analytics/brand-summary/posts", {
      blogId: input.blogId,
      query: { from: input.from, to: input.to, timezone: input.timezone },
    });
  },
};

export default brandSummaryPostsList;
