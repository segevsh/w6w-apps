import type { ActionDefinition } from "@w6w/types";
import { callFlag, encodeId } from "../lib/client.ts";
import { analyticsNetworks, blogId, select, str } from "../lib/params.ts";

type Input = { blogId: string; network: string; id: string };

/** `POST /v2/analytics/competitors/{network}?id=…`. */
const competitorAdd: ActionDefinition<Input> = {
  key: "competitor-add",
  type: "perform",
  resource: "competitor",
  title: "Add Competitor",
  description: "Start tracking a competitor account on a network.",
  idempotent: false,
  params: [
    blogId,
    select("network", "Network", analyticsNetworks, { required: true }),
    str("id", "Competitor account", {
      required: true,
      hint: "The competitor's account identifier on that network.",
    }),
  ],
  output: [{ key: "success", type: "boolean", label: "The vendor confirmed the change" }],

  execute(input, ctx) {
    return callFlag(ctx, "POST", `/v2/analytics/competitors/${encodeId(input.network)}`, {
      blogId: input.blogId,
      query: { id: input.id },
    });
  },
};

export default competitorAdd;
