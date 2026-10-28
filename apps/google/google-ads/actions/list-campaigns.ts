import type { ActionDefinition } from "@w6w/types";
import { assertEnum, buildGaql, fieldPaths, GoogleAdsClient } from "../lib/client.ts";
import {
  customerId,
  extraFields,
  limit,
  orderBy,
  pageToken,
  searchOutput,
  where,
} from "../lib/params.ts";

interface Input {
  customerId?: string;
  status?: string;
  advertisingChannelType?: string;
  where?: string;
  extraFields?: string;
  orderBy?: string;
  limit?: number;
  pageToken?: string;
}

/**
 * List campaigns, via GAQL `FROM campaign`.
 *
 * `campaign.status` is `ENABLED | PAUSED | REMOVED` (plus the never-returned
 * `UNKNOWN`/`UNSPECIFIED` sentinels). Google does *not* filter removed
 * campaigns out by default on this resource, so leaving the filter blank
 * genuinely returns everything — the status select is the way to narrow it.
 *
 * Both enum filters go through `assertEnum`, so a value can only ever be a bare
 * GAQL enum word and never a fragment of a query.
 */
const listCampaigns: ActionDefinition<Input> = {
  key: "list-campaigns",
  type: "read",
  resource: "campaign",
  title: "List Campaigns",
  description: "List campaigns with their status, channel type, budget and bidding strategy.",
  params: [
    customerId,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "ENABLED", label: "Enabled" },
        { value: "PAUSED", label: "Paused" },
        { value: "REMOVED", label: "Removed" },
      ],
      hint: "Blank returns every campaign, removed ones included.",
    },
    {
      key: "advertisingChannelType",
      label: "Channel type",
      type: "string",
      hint:
        "GAQL enum name, e.g. `SEARCH`, `DISPLAY`, `SHOPPING`, `VIDEO`, `PERFORMANCE_MAX`, `DEMAND_GEN`.",
    },
    where,
    extraFields,
    orderBy,
    limit,
    pageToken,
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
        ...fieldPaths(input.extraFields, "extraFields"),
      ],
      from: "campaign",
      where: [
        input.status ? `campaign.status = ${assertEnum(input.status, "status")}` : undefined,
        input.advertisingChannelType
          ? `campaign.advertising_channel_type = ${
            assertEnum(input.advertisingChannelType, "advertisingChannelType")
          }`
          : undefined,
        input.where,
      ],
      orderBy: input.orderBy ?? "campaign.id",
      limit: input.limit,
    });
    return client.search(client.customerId(input.customerId), {
      query,
      pageToken: input.pageToken,
    });
  },
};

export default listCampaigns;
