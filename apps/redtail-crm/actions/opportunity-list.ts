import type { ActionDefinition } from "@w6w/types";
import { RedtailClient } from "../lib/client.ts";
import type { RedtailOpportunity } from "../lib/types.ts";

interface Input {
  contactId?: number;
  stageId?: number;
}

interface Output {
  opportunities: RedtailOpportunity[];
}

/** `GET /opportunities?contact_id=&stage_id=` — the docs' own example URL names both filters. */
const opportunityList: ActionDefinition<Input, Output> = {
  key: "opportunity-list",
  type: "search",
  resource: "opportunity",
  title: "List Opportunities",
  description: "List sales opportunities, optionally filtered by contact or pipeline stage.",
  params: [
    { key: "contactId", label: "Contact ID", type: "number" },
    {
      key: "stageId",
      label: "Stage ID",
      type: "number",
      hint: "From GET /lists/opportunity_stages.",
    },
  ],
  output: [{ key: "opportunities", type: "array", label: "Opportunities" }],

  async execute(input, ctx) {
    const res = await new RedtailClient(ctx).request<Output>("/opportunities", {
      query: { contact_id: input.contactId, stage_id: input.stageId },
    });
    return { opportunities: res.data.opportunities ?? [] };
  },
};

export default opportunityList;
