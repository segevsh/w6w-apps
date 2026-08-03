import type { ActionDefinition } from "@w6w/types";
import { assertNumericId, buildGaql, fieldPaths, GoogleAdsClient } from "../lib/client.ts";
import { customerId, extraFields, searchOutput } from "../lib/params.ts";

interface Input {
  campaignId: string;
  customerId?: string;
  extraFields?: string;
}

/**
 * Read one campaign, via GAQL `FROM campaign WHERE campaign.id = …`.
 *
 * `CampaignService` has no `get` — its only read path is GAQL, so a
 * single-resource fetch is a query with an id predicate. The id is validated as
 * an integer before interpolation; there is no quoted-string form to escape
 * into here, so refusing anything non-numeric is the whole guard.
 *
 * Returns the same `results` envelope as every other read: zero rows means no
 * such campaign in this account, not an error.
 */
const getCampaign: ActionDefinition<Input> = {
  key: "get-campaign",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description: "Read a single campaign by ID, including its budget and bidding configuration.",
  params: [
    {
      key: "campaignId",
      label: "Campaign ID",
      type: "string",
      required: true,
      validation: { pattern: "^[0-9]+$" },
    },
    customerId,
    extraFields,
  ],
  output: searchOutput,

  execute(input, ctx) {
    const client = new GoogleAdsClient(ctx);
    const query = buildGaql({
      select: [
        "campaign.resource_name",
        "campaign.id",
        "campaign.name",
        "campaign.status",
        "campaign.serving_status",
        "campaign.advertising_channel_type",
        "campaign.advertising_channel_sub_type",
        "campaign.bidding_strategy_type",
        "campaign.campaign_budget",
        "campaign.start_date_time",
        "campaign.end_date_time",
        "campaign.optimization_score",
        "campaign.final_url_suffix",
        ...fieldPaths(input.extraFields, "extraFields"),
      ],
      from: "campaign",
      where: [`campaign.id = ${assertNumericId(input.campaignId, "campaignId")}`],
      limit: 1,
    });
    return client.search(client.customerId(input.customerId), { query });
  },
};

export default getCampaign;
