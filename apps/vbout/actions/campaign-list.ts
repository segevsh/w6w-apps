import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `GET /1/emailmarketing/campaigns.json` — Return email campaigns, filtered by state.
 */
interface Input {
  filter: string;
  limit?: number;
  page?: number;
}

const campaignList: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "read",
  resource: "campaign",
  title: "List Email Campaigns",
  description: "Return email campaigns, filtered by state.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "select",
      required: true,
      hint: "Which campaigns to return.",
      options: [
        { value: "all", label: "all" },
        { value: "sent", label: "sent" },
        { value: "scheduled", label: "scheduled" },
        { value: "draft", label: "draft" },
        { value: "automation", label: "automation" },
      ],
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Records per page.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "Page number.",
    },
  ],
  output: [
    { key: "campaigns", type: "object", label: "Campaigns: { count, items }" },
  ],

  async execute(input, ctx) {
    return await new VboutClient(ctx).get("emailmarketing/campaigns", {
      filter: input.filter,
      limit: input.limit,
      page: input.page,
    });
  },
};

export default campaignList;
