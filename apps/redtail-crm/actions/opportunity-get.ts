import type { ActionDefinition } from "@w6w/types";
import { RedtailClient } from "../lib/client.ts";
import type { RedtailOpportunity } from "../lib/types.ts";

interface Input {
  opportunityId: number;
}

interface Output {
  opportunity: RedtailOpportunity;
}

const opportunityGet: ActionDefinition<Input, Output> = {
  key: "opportunity-get",
  type: "read",
  resource: "opportunity",
  title: "Get Opportunity",
  description: "Get a single sales opportunity by id.",
  params: [
    { key: "opportunityId", label: "Opportunity ID", type: "number", required: true },
  ],
  output: [
    { key: "opportunity.id", type: "number", label: "Opportunity ID" },
    { key: "opportunity.name", type: "string", label: "Name" },
    { key: "opportunity.stage", type: "string", label: "Stage" },
    { key: "opportunity.amount", type: "string", label: "Amount" },
  ],

  async execute(input, ctx) {
    const res = await new RedtailClient(ctx).request<Output>(
      `/opportunities/${input.opportunityId}`,
    );
    return res.data;
  },
};

export default opportunityGet;
