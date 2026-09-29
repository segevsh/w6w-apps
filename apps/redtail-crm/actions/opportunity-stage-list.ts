import type { ActionDefinition } from "@w6w/types";
import { RedtailClient } from "../lib/client.ts";
import type { RedtailOpportunityStage } from "../lib/types.ts";

interface Input {
  page?: number;
}

interface Output {
  opportunity_stages: RedtailOpportunityStage[];
}

const opportunityStageList: ActionDefinition<Input, Output> = {
  key: "opportunity-stage-list",
  type: "read",
  resource: "opportunity-stage",
  title: "List Opportunity Stages",
  description: "List the pipeline stages this database's opportunities can be in — " +
    "useful for populating a stage selector elsewhere in a workflow.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      advanced: true,
      validation: { min: 1, integer: true },
    },
  ],
  output: [{ key: "opportunity_stages", type: "array", label: "Opportunity stages" }],

  async execute(input, ctx) {
    const res = await new RedtailClient(ctx).request<Output>("/lists/opportunity_stages", {
      query: { page: input.page },
    });
    return { opportunity_stages: res.data.opportunity_stages ?? [] };
  },
};

export default opportunityStageList;
