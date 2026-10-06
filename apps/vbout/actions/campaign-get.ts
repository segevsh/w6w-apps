import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `GET /1/emailmarketing/getcampaign.json` — Return one email campaign by ID.
 */
interface Input {
  id: string;
  type?: string;
}

const campaignGet: ActionDefinition<Input> = {
  key: "campaign-get",
  type: "read",
  resource: "campaign",
  title: "Get Email Campaign",
  description: "Return one email campaign by ID.",
  params: [
    {
      key: "id",
      label: "Campaign ID",
      type: "string",
      required: true,
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [{ value: "standard", label: "standard" }, {
        value: "automated",
        label: "automated",
      }],
    },
  ],
  output: [
    { key: "item", type: "object", label: "The campaign" },
  ],

  async execute(input, ctx) {
    return await new VboutClient(ctx).get("emailmarketing/getcampaign", {
      id: input.id,
      type: input.type,
    });
  },
};

export default campaignGet;
