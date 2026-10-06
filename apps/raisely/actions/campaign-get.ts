import type { ActionDefinition } from "@w6w/types";
import { compact, RaiselyClient, seg } from "../lib/client.ts";
import { privateParam } from "../lib/params.ts";

interface Input {
  campaign: string;
  private?: boolean;
  includeTags?: boolean;
  pruneConfig?: boolean;
}

const campaignGet: ActionDefinition<Input> = {
  key: "campaign-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description: "Retrieve one campaign by uuid, path or domain.",
  params: [
    {
      key: "campaign",
      label: "Campaign",
      type: "string",
      required: true,
      hint: "The uuid, path or domain of the campaign.",
    },
    { key: "includeTags", label: "Include tags", type: "boolean" },
    {
      key: "pruneConfig",
      label: "Prune config",
      type: "boolean",
      hint: "Leave out campaign.config to shrink the response (private queries only).",
    },
    privateParam(),
  ],
  output: [{ key: "uuid", type: "string", label: "campaign uuid" }],

  async execute(input, ctx) {
    return await new RaiselyClient(ctx).data(`/campaigns/${seg(input.campaign)}`, {
      query: compact({
        private: input.private,
        includeTags: input.includeTags,
        pruneConfig: input.pruneConfig,
      }),
    });
  },
};

export default campaignGet;
