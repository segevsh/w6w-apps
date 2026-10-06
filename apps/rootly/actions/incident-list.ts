import type { ActionDefinition } from "@w6w/types";
import { listResult, RootlyClient, strList } from "../lib/client.ts";

interface Input {
  search?: string;
  status?: string;
  kind?: string;
  severity?: string;
  severity_id?: string;
  services?: string;
  service_ids?: string;
  teams?: string;
  team_ids?: string;
  environments?: string;
  environment_ids?: string;
  labels?: string;
  user_id?: string;
  created_at_gte?: string;
  created_at_lte?: string;
  started_at_gte?: string;
  resolved_at_gte?: string;
  sort?: string;
  include?: string[] | string;
  page_number?: number;
  page_size?: number;
  page_after?: string;
}

/** `GET /v1/incidents` */
const incidentList: ActionDefinition<Input> = {
  key: "incident-list",
  type: "read",
  resource: "incident",
  title: "List Incidents",
  description:
    "List incidents, newest first by default, with filters on status, severity, services, teams, environments, labels and timestamps. Pages by number or by cursor.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches title, summary and sequential ID text.",
    },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "One status, e.g. started, mitigated, resolved, closed, cancelled.",
    },
    {
      key: "kind",
      label: "Kind",
      type: "string",
      hint: "test, normal, backfilled, scheduled, example (and the _sub variants).",
    },
    {
      key: "severity",
      label: "Severity",
      type: "string",
      hint: "Severity slug, e.g. `sev0`.",
    },
    {
      key: "severity_id",
      label: "Severity id",
      type: "string",
      hint: "Severity ID.",
    },
    {
      key: "services",
      label: "Services",
      type: "string",
      hint: "Service slug.",
    },
    {
      key: "service_ids",
      label: "Service ids",
      type: "string",
      hint: "Service ID.",
    },
    {
      key: "teams",
      label: "Teams",
      type: "string",
      hint: "Team slug.",
    },
    {
      key: "team_ids",
      label: "Team ids",
      type: "string",
      hint: "Team ID.",
    },
    {
      key: "environments",
      label: "Environments",
      type: "string",
      hint: "Environment slug.",
    },
    {
      key: "environment_ids",
      label: "Environment ids",
      type: "string",
      hint: "Environment ID.",
    },
    {
      key: "labels",
      label: "Labels",
      type: "string",
      hint: "Label filter.",
    },
    {
      key: "user_id",
      label: "User id",
      type: "string",
      hint: "Reporter user ID.",
    },
    {
      key: "created_at_gte",
      label: "Created from",
      type: "string",
      hint: "Created at or after (ISO 8601).",
    },
    {
      key: "created_at_lte",
      label: "Created to",
      type: "string",
      hint: "Created at or before (ISO 8601).",
    },
    {
      key: "started_at_gte",
      label: "Started from",
      type: "string",
      hint: "Started at or after (ISO 8601).",
    },
    {
      key: "resolved_at_gte",
      label: "Resolved from",
      type: "string",
      hint: "Resolved at or after (ISO 8601).",
    },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      hint:
        "created_at, updated_at, started_at, in_triage_at, mitigated_at, resolved_at; prefix `-` for descending.",
    },
    {
      key: "include",
      label: "Include",
      type: "array",
      item: { type: "string" },
      hint:
        "Related records to side-load into `included`, comma-separated: sub_statuses, causes, subscribers, roles, slack_messages, environments, incident_types, services, functionalities, groups, events, action_items, custom_field_selections, feedbacks, incident_post_mortem, alerts.",
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
    const res = await new RootlyClient(ctx).request("GET", "/v1/incidents", {
      query: {
        "filter[search]": input.search,
        "filter[status]": input.status,
        "filter[kind]": input.kind,
        "filter[severity]": input.severity,
        "filter[severity_id]": input.severity_id,
        "filter[services]": input.services,
        "filter[service_ids]": input.service_ids,
        "filter[teams]": input.teams,
        "filter[team_ids]": input.team_ids,
        "filter[environments]": input.environments,
        "filter[environment_ids]": input.environment_ids,
        "filter[labels]": input.labels,
        "filter[user_id]": input.user_id,
        "filter[created_at][gte]": input.created_at_gte,
        "filter[created_at][lte]": input.created_at_lte,
        "filter[started_at][gte]": input.started_at_gte,
        "filter[resolved_at][gte]": input.resolved_at_gte,
        "sort": input.sort,
        "include": strList(input.include)?.join(","),
        "page[number]": input.page_number,
        "page[size]": input.page_size,
        "page[after]": input.page_after,
      },
    });
    return listResult(res);
  },
};

export default incidentList;
