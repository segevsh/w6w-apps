import type { ActionDefinition } from "@w6w/types";
import { compact, RedtailClient } from "../lib/client.ts";
import type { RedtailOpportunityInput } from "../lib/types.ts";

interface Input {
  name: string;
  contactId?: number;
  sourceId?: number;
  opportunityType?: number;
  amount?: string;
  probability?: number;
  closeDate?: string;
  nextStep?: string;
  description?: string;
}

interface Output {
  success: boolean;
  id: number;
}

const opportunityCreate: ActionDefinition<Input, Output> = {
  key: "opportunity-create",
  type: "perform",
  resource: "opportunity",
  title: "Create Opportunity",
  description: "Create a sales opportunity, optionally linked to a contact.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "contactId", label: "Link to contact ID", type: "number" },
    {
      key: "sourceId",
      label: "Source ID",
      type: "number",
      advanced: true,
      hint: "From GET /lists/sources.",
    },
    {
      key: "opportunityType",
      label: "Opportunity type",
      type: "number",
      advanced: true,
      hint: "From GET /lists/opportunity_types.",
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
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "id", type: "number", label: "New opportunity ID" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating Redtail opportunity", { name: input.name });
    const body: RedtailOpportunityInput = compact({
      name: input.name,
      source_id: input.sourceId,
      opportunity_type: input.opportunityType,
      amount: input.amount,
      probability: input.probability,
      close_date: input.closeDate,
      next_step: input.nextStep,
      description: input.description,
      linked_contacts: input.contactId ? [{ contact_id: input.contactId }] : undefined,
    }) as RedtailOpportunityInput;
    const res = await new RedtailClient(ctx).request<Output>("/opportunities", {
      method: "POST",
      body,
    });
    return res.data;
  },
};

export default opportunityCreate;
