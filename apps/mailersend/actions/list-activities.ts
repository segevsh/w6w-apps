import type { ActionDefinition } from "@w6w/types";
import { dateParam, PAGE_OUTPUT, toList, toTimestamp } from "../lib/client.ts";
import { listOf, seg } from "../lib/factories.ts";

interface Input extends Record<string, unknown> {
  domainId: string;
  dateFrom: string | number;
  dateTo: string | number;
  event?: unknown;
  page?: number;
  limit?: number;
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
  "suppressed",
];

const listActivities: ActionDefinition<Input> = listOf<Input>({
  key: "list-activities",
  resource: "activity",
  title: "List Activities",
  description:
    "List a domain's delivery events (GET /v1/activity/{domainId}): sent, delivered, bounced, opened, clicked, suppressed and so on. `dateFrom` and `dateTo` are required and the window is capped by your plan's retention (1 to 30 days). `deferred` and `suppressed` need a Starter plan. 10 requests/minute, shared with List Emails.",
  path: (i) => `/activity/${seg(i.domainId)}`,
  params: [
    { key: "domainId", label: "Domain ID", type: "string", required: true },
    dateParam("dateFrom", "Date from", true),
    dateParam("dateTo", "Date to", true),
    {
      key: "event",
      label: "Event types",
      type: "multiselect",
      options: EVENTS.map((v) => ({ value: v, label: v })),
      hint: "Leave empty for all events.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1 to 1000. For older rows, narrow the date window instead.",
      validation: { min: 1, max: 1000, integer: true },
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "10 to 100 (default 25).",
      validation: { min: 10, max: 100, integer: true },
    },
  ],
  query: (i) => ({
    date_from: toTimestamp(i.dateFrom),
    date_to: toTimestamp(i.dateTo),
    event: toList(i.event),
    page: i.page,
    limit: i.limit,
  }),
  output: PAGE_OUTPUT,
});

export default listActivities;
