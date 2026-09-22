import type { ActionDefinition } from "@w6w/types";
import { HeyReachClient, numberList } from "../lib/client.ts";

interface Input {
  accountIds?: number[] | string;
  campaignIds?: number[] | string;
  startDate: string;
  endDate: string;
}

/**
 * `POST /api/public/stats/GetOverallStatsByCampaign` — the same window, split
 * per campaign.
 *
 * The request body is byte-for-byte the one `stats-get-overall` sends
 * (`{ accountIds, campaignIds, startDate, endDate }`, empty arrays meaning
 * "everything"). What changes is the response: both `byDayStats` and
 * `overallStats` come back as **lists of per-campaign objects** instead of one
 * aggregated object, each carrying `campaignId`, `campaignName`,
 * `isCampaignDeleted` and the same metric set.
 *
 * `isCampaignDeleted` is why this is worth having on its own: a campaign that
 * was deleted stops contributing new numbers but its history is still reported,
 * and without that flag a workflow would attribute a dead campaign's old results
 * to a live one.
 */
const action: ActionDefinition<Input> = {
  key: "stats-get-by-campaign",
  type: "read",
  resource: "stats",
  title: "Get Overall Stats by Campaign",
  description: "Read outreach statistics for a date window broken down per campaign, per day and " +
    "aggregated (POST /api/public/stats/GetOverallStatsByCampaign).",
  params: [
    {
      key: "accountIds",
      label: "Sender accounts",
      type: "array",
      item: { type: "number" },
      hint: 'Leave empty to include every sender — the API treats an empty list as "all".',
    },
    {
      key: "campaignIds",
      label: "Campaigns",
      type: "array",
      item: { type: "number" },
      hint: "Leave empty to include every campaign.",
    },
    {
      key: "startDate",
      label: "Start date",
      type: "datetime",
      required: true,
      hint: "ISO 8601, e.g. 2026-09-01T00:00:00.000Z.",
    },
    {
      key: "endDate",
      label: "End date",
      type: "datetime",
      required: true,
      hint: "ISO 8601, e.g. 2026-09-22T23:59:59.999Z.",
    },
  ],
  output: [
    { key: "byDayStats", type: "object", label: "Per-campaign statistics keyed by day" },
    { key: "overallStats", type: "array", label: "Per-campaign aggregate statistics" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/stats/GetOverallStatsByCampaign", {
      method: "POST",
      body: {
        accountIds: numberList(input.accountIds, "Sender accounts") ?? [],
        campaignIds: numberList(input.campaignIds, "Campaigns") ?? [],
        startDate: input.startDate,
        endDate: input.endDate,
      },
    });
  },
};

export default action;
