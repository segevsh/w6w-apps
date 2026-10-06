import type { ActionDefinition } from "@w6w/types";
import { listResult, RootlyClient, strList } from "../lib/client.ts";

interface Input {
  status?: string;
  source?: string;
  services?: string;
  environments?: string;
  groups?: string;
  labels?: string;
  include?: string[] | string;
  page_number?: number;
  page_size?: number;
  page_after?: string;
}

/** `GET /v1/alerts` */
const alertList: ActionDefinition<Input> = {
  key: "alert-list",
  type: "read",
  resource: "alert",
  title: "List Alerts",
  description:
    "List alerts, optionally filtered by status, source, service, environment, team or label.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "e.g. open, triggered, acknowledged, resolved.",
    },
    {
      key: "source",
      label: "Source",
      type: "string",
      hint: "Alert source.",
    },
    {
      key: "services",
      label: "Services",
      type: "string",
      hint: "Service slug.",
    },
    {
      key: "environments",
      label: "Environments",
      type: "string",
      hint: "Environment slug.",
    },
    {
      key: "groups",
      label: "Groups",
      type: "string",
      hint: "Team slug.",
    },
    {
      key: "labels",
      label: "Labels",
      type: "string",
      hint: "Label filter.",
    },
    {
      key: "include",
      label: "Include",
      type: "array",
      item: { type: "string" },
      hint:
        "Related records to side-load, comma-separated: environments, services, groups, functionalities, responders, incidents, notified_users, events, alert_urgency, heartbeat, live_call_router, alert_group, group_leader_alert, group_member_alerts, alert_field_values, alerting_targets, escalation_policies, alert_call_recording.",
    },
    {
      key: "page_number",
      label: "Page number",
      type: "number",
      hint: "1-based page index.",
    },
    {
      key: "page_size",
      label: "Page size",
      type: "number",
      hint: "Items per page.",
    },
    {
      key: "page_after",
      label: "Page cursor",
      type: "string",
      hint:
        "Cursor from `meta.next_cursor` of the previous page; use instead of a page number for deep paging.",
    },
  ],
  output: [
    {
      key: "items",
      type: "array",
      label: "Records, each flattened to its attributes plus `id` and `type`",
    },
    { key: "included", type: "array", label: "Side-loaded related records (same flattened shape)" },
    {
      key: "meta",
      type: "object",
      label: "Paging: current_page, next_page, next_cursor, total_count, total_pages",
    },
    { key: "links", type: "object", label: "Paging links: self, first, prev, next, last" },
  ],

  async execute(input, ctx) {
    const res = await new RootlyClient(ctx).request("GET", "/v1/alerts", {
      query: {
        "filter[status]": input.status,
        "filter[source]": input.source,
        "filter[services]": input.services,
        "filter[environments]": input.environments,
        "filter[groups]": input.groups,
        "filter[labels]": input.labels,
        "include": strList(input.include)?.join(","),
        "page[number]": input.page_number,
        "page[size]": input.page_size,
        "page[after]": input.page_after,
      },
    });
    return listResult(res);
  },
};

export default alertList;
