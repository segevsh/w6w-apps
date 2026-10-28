import type { ActionDefinition } from "@w6w/types";
import {
  assertDateRange,
  assertIsoDate,
  buildGaql,
  DATE_RANGES,
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
  resource?: string;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  segmentByDate?: boolean;
  customerId?: string;
  where?: string;
  extraFields?: string;
  orderBy?: string;
  limit?: number;
  pageToken?: string;
}

/**
 * A performance report, via GAQL with a `metrics.*` selection and a date
 * predicate.
 *
 * This is the reporting half of the Google Ads API, and it is the same `search`
 * call as every other read — there is no separate reporting endpoint. What
 * makes it a report is what you select: attributes identify the row, `metrics.*`
 * aggregate over it, and `segments.*` split it.
 *
 * **Segmentation changes the row count, not just the columns.** Adding
 * `segments.date` turns one row per campaign into one row per campaign per day,
 * so it is an explicit toggle rather than something always on — a caller asking
 * for a 90-day total does not want 90 rows.
 *
 * **Dates.** Either a predefined range with `DURING` (Google publishes a closed
 * set, enforced by `assertDateRange`) or an explicit `BETWEEN 'yyyy-MM-dd' AND
 * 'yyyy-MM-dd'`. Explicit dates win when both are given. Both paths are
 * validated before interpolation, so neither can carry a query fragment.
 *
 * `metrics.cost_micros` is micros of the account currency, like every money
 * field here.
 */
const performanceReport: ActionDefinition<Input> = {
  key: "performance-report",
  type: "read",
  resource: "report",
  title: "Performance Report",
  description:
    "Impressions, clicks, cost, CTR and conversions over a date range, for campaigns, ad groups, ads or keywords.",
  params: [
    {
      key: "resource",
      label: "Report level",
      type: "select",
      default: "campaign",
      options: [
        { value: "campaign", label: "Campaign" },
        { value: "ad_group", label: "Ad group" },
        { value: "ad_group_ad", label: "Ad" },
        { value: "ad_group_criterion", label: "Keyword / criterion" },
        { value: "customer", label: "Account" },
      ],
      hint: "The GAQL resource the report is grouped by.",
    },
    {
      key: "dateRange",
      label: "Date range",
      type: "select",
      default: "LAST_30_DAYS",
      options: DATE_RANGES.map((v) => ({ value: v, label: v.replaceAll("_", " ").toLowerCase() })),
      hint: "Ignored when explicit start and end dates are given.",
    },
    {
      key: "startDate",
      label: "Start date",
      type: "date",
      hint: "`yyyy-MM-dd`. Set both start and end to override the date range.",
    },
    { key: "endDate", label: "End date", type: "date", hint: "`yyyy-MM-dd`." },
    {
      key: "segmentByDate",
      label: "Segment by date",
      type: "boolean",
      hint: "Adds `segments.date`, producing one row per day instead of one total row.",
    },
    customerId,
    where,
    extraFields,
    orderBy,
    limit,
    pageToken,
  ],
  output: searchOutput,

  execute(input, ctx) {
    const client = new GoogleAdsClient(ctx);
    const resource = input.resource ?? "campaign";
    if (!/^[a-z][a-z0-9_]*$/.test(resource)) {
      throw new Error("`resource` must be a GAQL resource name in snake_case.");
    }

    // Attribute columns that make each report level readable. `customer` has no
    // parent to name, so it stands alone.
    const identity: Record<string, string[]> = {
      customer: ["customer.id", "customer.descriptive_name"],
      campaign: ["campaign.id", "campaign.name", "campaign.status"],
      ad_group: ["ad_group.id", "ad_group.name", "campaign.id", "campaign.name"],
      ad_group_ad: ["ad_group_ad.ad.id", "ad_group.id", "ad_group.name", "campaign.name"],
      ad_group_criterion: [
        "ad_group_criterion.criterion_id",
        "ad_group_criterion.keyword.text",
        "ad_group.name",
        "campaign.name",
      ],
    };

    const explicit = input.startDate && input.endDate;
    const datePredicate = explicit
      ? `segments.date BETWEEN '${assertIsoDate(input.startDate!, "startDate")}' AND '${
        assertIsoDate(input.endDate!, "endDate")
      }'`
      : `segments.date DURING ${assertDateRange(input.dateRange ?? "LAST_30_DAYS")}`;

    const query = buildGaql({
      select: [
        ...(identity[resource] ?? []),
        ...(input.segmentByDate ? ["segments.date"] : []),
        "metrics.impressions",
        "metrics.clicks",
        "metrics.ctr",
        "metrics.average_cpc",
        "metrics.cost_micros",
        "metrics.conversions",
        "metrics.conversions_value",
        ...fieldPaths(input.extraFields, "extraFields"),
      ],
      from: resource,
      where: [datePredicate, input.where],
      orderBy: input.orderBy ?? "metrics.impressions DESC",
      limit: input.limit,
    });

    return client.search(client.customerId(input.customerId), {
      query,
      pageToken: input.pageToken,
    });
  },
};

export default performanceReport;
