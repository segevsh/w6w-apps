import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, encodeId } from "../lib/client.ts";
import { idParam, includesParam } from "../lib/params.ts";

interface Input {
  estimateId: string;
  includes?: string;
}

const action: ActionDefinition<Input> = {
  key: "estimate-get",
  type: "read",
  resource: "estimate",
  title: "Get Estimate",
  description: "Get one estimate with its financial totals and section links.",
  params: [
    idParam("estimateId", "Estimate id", "From List Job Estimates."),
    includesParam("see AccuLynx's reference for this endpoint"),
  ],
  output: [
    { key: "id", type: "string", label: "Estimate id" },
    { key: "estimateNumber", type: "string", label: "Estimate number" },
    { key: "isPrimary", type: "boolean", label: "Primary estimate" },
    { key: "job", type: "object", label: "Job link" },
    { key: "financials", type: "object", label: "Tax, overhead, profit, cost and price totals" },
    { key: "sections", type: "array", label: "Section links" },
  ],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get(`/estimates/${encodeId(input.estimateId)}`, {
      includes: input.includes,
    });
  },
};

export default action;
