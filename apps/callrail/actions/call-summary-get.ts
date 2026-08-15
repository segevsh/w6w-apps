import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId, toList } from "../lib/client.ts";
import { accountIdParam, companyIdParam, dateRangeParams } from "../lib/params.ts";

/**
 * `GET /v3/a/{account_id}/calls/summary.json` — Summarizing Call Data.
 *
 * Aggregate call counts (total, missed, answered, first-time-callers,
 * average duration, leads), optionally grouped by source, keywords,
 * campaign, referrer, landing page or company. "Grouping by company is only
 * available when using the account-level endpoint" — true here, since this
 * action always calls the account-level path.
 */
interface Input {
  accountId: string;
  companyId?: string;
  groupBy?: "source" | "keywords" | "campaign" | "referrer" | "landing_page" | "company";
  fields?: string;
  device?: "desktop" | "mobile" | "all";
  minDuration?: number;
  maxDuration?: number;
  tags?: string;
  trackerIds?: string;
  direction?: "inbound" | "outbound" | "all";
  answerStatus?: "answered" | "missed" | "voicemail" | "all";
  firstTimeCallers?: boolean;
  leadStatus?: "good_lead" | "not_a_lead" | "not_scored";
  agent?: string;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  timeZone?: string;
}

const callSummaryGet: ActionDefinition<Input> = {
  key: "call-summary-get",
  type: "read",
  resource: "call",
  title: "Summarize Calls",
  description: "Aggregate call counts for an account or company, optionally grouped by " +
    "source, keywords, campaign, referrer, landing page or company.",
  params: [
    accountIdParam,
    companyIdParam,
    {
      key: "groupBy",
      label: "Group by",
      type: "select",
      options: [
        { value: "source", label: "Source" },
        { value: "keywords", label: "Keywords" },
        { value: "campaign", label: "Campaign" },
        { value: "referrer", label: "Referrer" },
        { value: "landing_page", label: "Landing page" },
        { value: "company", label: "Company (account-level only)" },
      ],
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint: "Comma-separated: total_calls, missed_calls, answered_calls, first_time_callers, " +
        "average_duration, formatted_average_duration, leads. Defaults to total_calls.",
    },
    {
      key: "device",
      label: "Device",
      type: "select",
      options: [
        { value: "desktop", label: "Desktop" },
        { value: "mobile", label: "Mobile" },
        { value: "all", label: "All" },
      ],
    },
    { key: "minDuration", label: "Min duration (seconds)", type: "number" },
    { key: "maxDuration", label: "Max duration (seconds)", type: "number" },
    { key: "tags", label: "Filter by tags", type: "string", hint: "Comma-separated tag names." },
    {
      key: "trackerIds",
      label: "Filter by trackers",
      type: "string",
      hint: "Comma-separated Tracker ids.",
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [
        { value: "inbound", label: "Inbound" },
        { value: "outbound", label: "Outbound" },
        { value: "all", label: "All" },
      ],
    },
    {
      key: "answerStatus",
      label: "Answer status",
      type: "select",
      options: [
        { value: "answered", label: "Answered" },
        { value: "missed", label: "Missed" },
        { value: "voicemail", label: "Voicemail" },
        { value: "all", label: "All" },
      ],
    },
    { key: "firstTimeCallers", label: "First-time callers only", type: "boolean" },
    {
      key: "leadStatus",
      label: "Lead status",
      type: "select",
      options: [
        { value: "good_lead", label: "Good lead" },
        { value: "not_a_lead", label: "Not a lead" },
        { value: "not_scored", label: "Not scored" },
      ],
    },
    { key: "agent", label: "Agent", type: "string", hint: "A CallRail user id." },
    ...dateRangeParams(),
  ],
  output: [
    { key: "start_date", type: "string", label: "Range start" },
    { key: "end_date", type: "string", label: "Range end" },
    { key: "total_results", type: "object", label: "Totals across the whole range" },
    { key: "grouped_by", type: "string", label: "The group_by value used, if any" },
    { key: "grouped_results", type: "array", label: "Per-group totals, if grouped" },
  ],

  execute(input, ctx) {
    return new CallRailClient(ctx).json(
      `/a/${encodeId(input.accountId)}/calls/summary.json`,
      {
        query: {
          company_id: input.companyId,
          group_by: input.groupBy,
          fields: input.fields,
          device: input.device,
          min_duration: input.minDuration,
          max_duration: input.maxDuration,
          tags: toList(input.tags),
          tracker_ids: toList(input.trackerIds),
          direction: input.direction,
          answer_status: input.answerStatus,
          first_time_callers: input.firstTimeCallers,
          lead_status: input.leadStatus,
          agent: input.agent,
          date_range: input.startDate ? undefined : input.dateRange,
          start_date: input.startDate,
          end_date: input.endDate,
          time_zone: input.timeZone,
        },
      },
    );
  },
};

export default callSummaryGet;
