import type { ActionDefinition } from "@w6w/types";
import { callFlag, encodeId } from "../lib/client.ts";
import { analyticsNetworks, blogId, select, str } from "../lib/params.ts";

type Input = { blogId: string; network: string; competitorId: string };

/** `DELETE /v2/analytics/competitors/{network}?competitorId=…`. */
const competitorRemove: ActionDefinition<Input> = {
  key: "competitor-remove",
  type: "perform",
  resource: "competitor",
  title: "Remove Competitor",
  description: "Stop tracking a competitor on a network.",
  idempotent: true,
  params: [
    blogId,
    select("network", "Network", analyticsNetworks, { required: true }),
    str("competitorId", "Competitor ID", { required: true, hint: "An id from List Competitors." }),
  ],
  output: [{ key: "success", type: "boolean", label: "The vendor confirmed the change" }],

  execute(input, ctx) {
    return callFlag(ctx, "DELETE", `/v2/analytics/competitors/${encodeId(input.network)}`, {
      blogId: input.blogId,
      query: { competitorId: input.competitorId },
    });
  },
};

export default competitorRemove;
