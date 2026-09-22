import type { ActionDefinition } from "@w6w/types";
import { HeyReachClient, numberList } from "../lib/client.ts";

interface Input {
  accountIds?: number[] | string;
  campaignIds?: number[] | string;
  startDate: string;
  endDate: string;
}

/**
 * `POST /api/public/stats/GetOverallStats` — outreach results for a window.
 *
 * The body is `{ accountIds, campaignIds, startDate, endDate }`, and the
 * document is explicit that **an empty id list means "everything"**: an empty
 * `accountIds` includes every sender, an empty `campaignIds` every campaign.
 * Both arrays are therefore always sent, even when empty — omitting them is not
 * the same thing.
 *
 * The window is a pair of ISO 8601 timestamps; the document's own worked example
 * runs `2024-12-17T00:00:00.000Z` to `2024-12-19T23:59:59.999Z`.
 *
 * The response is two views of the same numbers: `byDayStats`, keyed by day,
 * and `overallStats`, the aggregate. Each carries profile views, post likes,
 * follows, messages sent/started/replied, InMails sent/started/replied,
 * connection requests sent/accepted, and the three derived rates
 * (`messageReplyRate`, `inMailReplyRate`, `connectionAcceptanceRate`).
 */
const action: ActionDefinition<Input> = {
  key: "stats-get-overall",
  type: "read",
  resource: "stats",
  title: "Get Overall Stats",
  description:
    "Read outreach statistics for a date window, per day and aggregated, optionally scoped to " +
    "particular senders or campaigns (POST /api/public/stats/GetOverallStats).",
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
    { key: "byDayStats", type: "object", label: "Statistics keyed by day" },
    { key: "overallStats", type: "object", label: "Aggregate statistics" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/stats/GetOverallStats", {
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
