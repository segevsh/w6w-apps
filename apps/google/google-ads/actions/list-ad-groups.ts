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
  campaignId?: string;
  status?: string;
  where?: string;
  extraFields?: string;
  orderBy?: string;
  limit?: number;
  pageToken?: string;
}

/**
 * List ad groups, via GAQL `FROM ad_group`.
 *
 * `ad_group.campaign` holds the parent campaign's *resource name*, not its id,
 * so narrowing by campaign is a predicate on `campaign.id` — GAQL exposes the
 * parent resource's fields on a child's `FROM` without a join, which is the one
 * place its lack of joins doesn't bite.
 *
 * `ad_group.cpc_bid_micros` is in micros of the account currency, like every
 * other money field in this API.
 */
const listAdGroups: ActionDefinition<Input> = {
  key: "list-ad-groups",
  type: "read",
  resource: "ad_group",
  title: "List Ad Groups",
  description: "List ad groups, optionally narrowed to one campaign, with their bids and status.",
  params: [
    customerId,
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
        "ad_group.resource_name",
        "ad_group.id",
        "ad_group.name",
        "ad_group.status",
        "ad_group.type",
        "ad_group.campaign",
        "ad_group.cpc_bid_micros",
        "campaign.id",
        "campaign.name",
        ...fieldPaths(input.extraFields, "extraFields"),
      ],
      from: "ad_group",
      where: [
        input.campaignId
          ? `campaign.id = ${assertNumericId(input.campaignId, "campaignId")}`
          : undefined,
        input.status ? `ad_group.status = ${assertEnum(input.status, "status")}` : undefined,
        input.where,
      ],
      orderBy: input.orderBy ?? "ad_group.id",
      limit: input.limit,
    });
    return client.search(client.customerId(input.customerId), {
      query,
      pageToken: input.pageToken,
    });
  },
};

export default listAdGroups;
