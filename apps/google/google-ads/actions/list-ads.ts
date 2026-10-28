import type { ActionDefinition } from "@w6w/types";
import {
  assertEnum,
  assertNumericId,
  buildGaql,
  fieldPaths,
  GoogleAdsClient,
} from "../lib/client.ts";
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
  adGroupId?: string;
  campaignId?: string;
  status?: string;
  where?: string;
  extraFields?: string;
  orderBy?: string;
  limit?: number;
  pageToken?: string;
}

/**
 * List ads, via GAQL `FROM ad_group_ad`.
 *
 * `ad_group_ad` is the association between an ad and an ad group, and it is the
 * queryable resource — `ad` on its own is not a `FROM` target. The ad itself
 * hangs off it as `ad_group_ad.ad.*`, and `ad_group_ad.status` (the ad's status
 * *in this ad group*) is a different field from the policy verdict under
 * `ad_group_ad.policy_summary`.
 *
 * `ad_group_ad.ad.final_urls` is repeated, so it comes back as an array.
 */
const listAds: ActionDefinition<Input> = {
  key: "list-ads",
  type: "read",
  resource: "ad_group_ad",
  title: "List Ads",
  description:
    "List ads with their type, final URLs, status and policy approval, optionally narrowed to one ad group or campaign.",
  params: [
    customerId,
    {
      key: "adGroupId",
      label: "Ad group ID",
      type: "string",
      hint: "Optional. Restricts the result to one ad group.",
      validation: { pattern: "^[0-9]*$" },
    },
    {
      key: "campaignId",
      label: "Campaign ID",
      type: "string",
      hint: "Optional. Restricts the result to one campaign.",
      validation: { pattern: "^[0-9]*$" },
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "ENABLED", label: "Enabled" },
        { value: "PAUSED", label: "Paused" },
        { value: "REMOVED", label: "Removed" },
      ],
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
        "ad_group_ad.resource_name",
        "ad_group_ad.status",
        "ad_group_ad.ad_group",
        "ad_group_ad.ad.id",
        "ad_group_ad.ad.name",
        "ad_group_ad.ad.type",
        "ad_group_ad.ad.final_urls",
        "ad_group_ad.policy_summary.approval_status",
        "ad_group.id",
        "ad_group.name",
        "campaign.id",
        "campaign.name",
        ...fieldPaths(input.extraFields, "extraFields"),
      ],
      from: "ad_group_ad",
      where: [
        input.adGroupId
          ? `ad_group.id = ${assertNumericId(input.adGroupId, "adGroupId")}`
          : undefined,
        input.campaignId
          ? `campaign.id = ${assertNumericId(input.campaignId, "campaignId")}`
          : undefined,
        input.status ? `ad_group_ad.status = ${assertEnum(input.status, "status")}` : undefined,
        input.where,
      ],
      orderBy: input.orderBy ?? "ad_group_ad.ad.id",
      limit: input.limit,
    });
    return client.search(client.customerId(input.customerId), {
      query,
      pageToken: input.pageToken,
    });
  },
};

export default listAds;
