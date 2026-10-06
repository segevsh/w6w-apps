import type { ActionDefinition } from "@w6w/types";
import { dateParam, MailerSendClient, toList, toUnix } from "../lib/client.ts";

interface Input {
  dateFrom: string | number;
  dateTo: string | number;
  domainId?: string;
  groupBy?: string;
  tags?: unknown;
  event?: unknown;
}

const EVENTS = [
  "queued",
  "sent",
  "delivered",
  "soft_bounced",
  "hard_bounced",
  "deferred",
  "opened",
  "opened_unique",
  "clicked",
  "clicked_unique",
  "unsubscribed",
  "spam_complaints",
  "survey_opened",
  "survey_submitted",
];

const getAnalyticsByDate: ActionDefinition<Input> = {
  key: "get-analytics-by-date",
  type: "read",
  resource: "analytics",
  title: "Get Analytics by Date",
  description:
    "Event counts over time (GET /v1/analytics/date), bucketed by day, week, month or year. Every date in the range is present, including those with no events, and every requested event appears with a count (0 by default).",
  params: [
    dateParam("dateFrom", "Date from", true),
    dateParam("dateTo", "Date to", true),
    { key: "domainId", label: "Domain ID", type: "string", hint: "Optional; default all domains." },
    {
      key: "groupBy",
      label: "Group by",
      type: "select",
      options: ["days", "weeks", "months", "years"].map((v) => ({ value: v, label: v })),
      hint: "Default days.",
    },
    {
      key: "event",
      label: "Events",
      type: "multiselect",
      options: EVENTS.map((v) => ({ value: v, label: v })),
    },
    { key: "tags", label: "Tags", type: "json", hint: "Only count emails with these tags." },
  ],
  output: [{
    key: "data",
    type: "object",
    label: "`stats`: one row per bucket with `date` and a count per event",
  }],

  execute(input, ctx) {
    return new MailerSendClient(ctx).json("/analytics/date", {
      query: {
        domain_id: input.domainId,
        date_from: toUnix(input.dateFrom),
        date_to: toUnix(input.dateTo),
        group_by: input.groupBy,
        tags: toList(input.tags),
        event: toList(input.event),
      },
    });
  },
};

export default getAnalyticsByDate;
