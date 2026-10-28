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
  matchType?: string;
  status?: string;
  includeNegative?: boolean;
  where?: string;
  extraFields?: string;
  orderBy?: string;
  limit?: number;
  pageToken?: string;
}

/**
 * List keywords, via GAQL `FROM ad_group_criterion`.
 *
 * There is no `keyword` resource. A keyword is an `ad_group_criterion` whose
 * `type` is `KEYWORD`, with the text and match type under
 * `ad_group_criterion.keyword.*` — so that type predicate is always applied and
 * is not optional. This is the same query Google's own REST docs use as their
 * canonical `search` example.
 *
 * Negative keywords live on the same resource, distinguished by
 * `ad_group_criterion.negative`. They are included by default because excluding
 * them silently would misreport an ad group's targeting; the flag narrows to
 * positives only.
 *
 * `quality_info.quality_score` is output-only and is often absent — Google
 * omits it when it has too little data, which is not an error.
 */
const listKeywords: ActionDefinition<Input> = {
  key: "list-keywords",
  type: "read",
  resource: "ad_group_criterion",
  title: "List Keywords",
  description:
    "List keyword criteria with their text, match type, status and quality score. Negative keywords are included by default.",
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
      key: "matchType",
      label: "Match type",
      type: "select",
      options: [
        { value: "EXACT", label: "Exact" },
        { value: "PHRASE", label: "Phrase" },
        { value: "BROAD", label: "Broad" },
      ],
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
    {
      key: "includeNegative",
      label: "Include negative keywords",
      type: "boolean",
      default: true,
      hint: "Uncheck to return only positive (targeting) keywords.",
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
        "ad_group_criterion.resource_name",
        "ad_group_criterion.criterion_id",
        "ad_group_criterion.keyword.text",
        "ad_group_criterion.keyword.match_type",
        "ad_group_criterion.status",
        "ad_group_criterion.negative",
        "ad_group_criterion.quality_info.quality_score",
        "ad_group.id",
        "ad_group.name",
        "campaign.id",
        "campaign.name",
        ...fieldPaths(input.extraFields, "extraFields"),
      ],
      from: "ad_group_criterion",
      where: [
        "ad_group_criterion.type = KEYWORD",
        input.includeNegative === false ? "ad_group_criterion.negative = FALSE" : undefined,
        input.adGroupId
          ? `ad_group.id = ${assertNumericId(input.adGroupId, "adGroupId")}`
          : undefined,
        input.campaignId
          ? `campaign.id = ${assertNumericId(input.campaignId, "campaignId")}`
          : undefined,
        input.matchType
          ? `ad_group_criterion.keyword.match_type = ${assertEnum(input.matchType, "matchType")}`
          : undefined,
        input.status
          ? `ad_group_criterion.status = ${assertEnum(input.status, "status")}`
          : undefined,
        input.where,
      ],
      orderBy: input.orderBy ?? "ad_group_criterion.criterion_id",
      limit: input.limit,
    });
    return client.search(client.customerId(input.customerId), {
      query,
      pageToken: input.pageToken,
    });
  },
};

export default listKeywords;
