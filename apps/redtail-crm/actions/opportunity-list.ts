import type { ActionDefinition } from "@w6w/types";
import { RedtailClient, type RedtailMeta } from "../lib/client.ts";
import { pageParams } from "../lib/params.ts";
import type { RedtailOpportunity } from "../lib/types.ts";

interface Input {
  contactId?: number;
  stageId?: number;
  page?: number;
}

interface Output {
  opportunities: RedtailOpportunity[];
  meta?: RedtailMeta;
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
    ...pageParams,
  ],
  output: [{ key: "opportunities", type: "array", label: "Opportunities" }],

  async execute(input, ctx) {
    const res = await new RedtailClient(ctx).request<Output>("/opportunities", {
      query: { contact_id: input.contactId, stage_id: input.stageId, page: input.page },
    });
    return { opportunities: res.data.opportunities ?? [], ...(res.meta ? { meta: res.meta } : {}) };
  },
};

export default opportunityList;
