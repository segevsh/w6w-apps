import type { ActionDefinition } from "@w6w/types";
import { compact, RedtailClient } from "../lib/client.ts";

interface Input {
  opportunityId: number;
  name?: string;
  stageId?: number;
  amount?: string;
  probability?: number;
  closeDate?: string;
  nextStep?: string;
  description?: string;
}

interface Output {
  updated: boolean;
}

const opportunityUpdate: ActionDefinition<Input, Output> = {
  key: "opportunity-update",
  type: "perform",
  resource: "opportunity",
  title: "Update Opportunity",
  description: "Update a sales opportunity — including moving it to a new pipeline stage. " +
    "Redtail answers 204 No Content on success. Only the fields provided are changed.",
  idempotent: true,
  params: [
    { key: "opportunityId", label: "Opportunity ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
    {
      key: "stageId",
      label: "Stage ID",
      type: "number",
      hint: "From GET /lists/opportunity_stages.",
    },
    { key: "amount", label: "Amount", type: "string" },
    {
      key: "probability",
      label: "Probability (%)",
      type: "number",
      validation: { min: 0, max: 100, integer: true },
    },
    { key: "closeDate", label: "Expected close date", type: "date" },
    { key: "nextStep", label: "Next step", type: "string" },
    { key: "description", label: "Description", type: "text" },
  ],
  output: [{ key: "updated", type: "boolean", label: "Updated" }],

  async execute(input, ctx) {
    const body = compact({
      name: input.name,
      stage_id: input.stageId,
      amount: input.amount,
      probability: input.probability,
      close_date: input.closeDate,
      next_step: input.nextStep,
      description: input.description,
    });
    await new RedtailClient(ctx).request(`/opportunities/${input.opportunityId}`, {
      method: "PUT",
      body,
    });
    return { updated: true };
  },
};

export default opportunityUpdate;
