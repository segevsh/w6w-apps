import type { ActionDefinition } from "@w6w/types";
import { call, pick, requireArray, V1 } from "../lib/client.ts";
import { bool, campaignId, prospectsParam, str } from "../lib/params.ts";

type Input = {
  campaign_id: string;
  send_after?: string;
  force?: boolean;
  file_name?: string;
  prospects: unknown[] | string;
};

const prospectAddToCampaign: ActionDefinition<Input> = {
  key: "prospect-add-to-campaign",
  type: "perform",
  resource: "prospect",
  title: "Add Prospects to Campaign",
  description: "Add prospects to a campaign, creating them if new (up to 20,000 per request).",
  idempotent: false,
  params: [
    campaignId,
    str("send_after", "Send after", {
      hint: "Earliest contact time, ISO 8601, e.g. 2025-04-01T00:01:01+0000.",
    }),
    bool("force", "Force", {
      hint:
        "Add even if the global status is not ACTIVE. Prospects may be contacted again; use with caution.",
    }),
    str("file_name", "Import batch name", { hint: "Shown in the imported column." }),
    prospectsParam,
  ],
  output: [
    {
      key: "prospects",
      type: "array",
      label: "Per-prospect result: email, id, duplicate flag or error",
    },
    { key: "status", type: "object", label: "Overall status block" },
  ],

  async execute(input, ctx) {
    const body = {
      campaign: { campaign_id: Number(input.campaign_id), ...pick(input, ["send_after"]) },
      ...(input.force === undefined ? {} : { force: input.force }),
      ...pick(input, ["file_name"]),
      prospects: requireArray("prospects", input.prospects, 20000),
    };
    return (await call(ctx, "POST", V1, "/add_prospects_campaign", { body })) as Record<
      string,
      unknown
    >;
  },
};

export default prospectAddToCampaign;
