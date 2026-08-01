import type { ActionDefinition } from "@w6w/types";
import { csv, PagerDutyClient } from "../lib/client.ts";

/**
 * `GET /incidents` — verified against PagerDuty's OpenAPI schema
 * (https://github.com/PagerDuty/api-schema).
 */
const action: ActionDefinition = {
  key: "incident-list",
  type: "read",
  resource: "incident",
  title: "List incidents",
  description: "List incidents, optionally filtered by status, urgency, service or assignee.",
  params: [
    { key: "returnAll", label: "Return All", type: "boolean", default: false },
    { key: "limit", label: "Limit", type: "number", default: 100, hint: "Max number of results" },
    {
      key: "statuses",
      label: "Statuses",
      type: "multiselect",
      default: [],
      options: [
        { value: "triggered", label: "Triggered" },
        { value: "acknowledged", label: "Acknowledged" },
        { value: "resolved", label: "Resolved" },
      ],
    },
    {
      key: "urgencies",
      label: "Urgencies",
      type: "multiselect",
      default: [],
      options: [
        { value: "high", label: "High" },
        { value: "low", label: "Low" },
      ],
    },
    {
      key: "serviceIds",
      label: "Service IDs",
      type: "string",
      default: "",
      hint: "Comma-separated list of service IDs",
    },
    {
      key: "teamIds",
      label: "Team IDs",
      type: "string",
      default: "",
      hint: "Comma-separated list of team IDs",
    },
    {
      key: "userIds",
      label: "Assigned User IDs",
      type: "string",
      default: "",
      hint: "Comma-separated list of user IDs; returns only incidents assigned to these users",
    },
    { key: "incidentKey", label: "Incident Key", type: "string", default: "" },
    {
      key: "since",
      label: "Since",
      type: "datetime",
      default: "",
      hint: "Start of the date range (max 6 months)",
    },
    { key: "until", label: "Until", type: "datetime", default: "" },
    {
      key: "sortBy",
      label: "Sort By",
      type: "string",
      default: "",
      placeholder: "created_at:desc",
      hint: "field:asc|desc — field is one of incident_number/created_at/resolved_at/urgency",
    },
  ],

  async execute(input, ctx) {
    const p = input as {
      returnAll?: boolean;
      limit?: number;
      statuses?: string[];
      urgencies?: string[];
      serviceIds?: string;
      teamIds?: string;
      userIds?: string;
      incidentKey?: string;
      since?: string;
      until?: string;
      sortBy?: string;
    };
    const client = new PagerDutyClient(ctx);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 100);

    const query = {
      statuses: Array.isArray(p.statuses) && p.statuses.length ? p.statuses : undefined,
      urgencies: Array.isArray(p.urgencies) && p.urgencies.length ? p.urgencies : undefined,
      service_ids: csv(p.serviceIds),
      team_ids: csv(p.teamIds),
      user_ids: csv(p.userIds),
      incident_key: p.incidentKey || undefined,
      since: p.since || undefined,
      until: p.until || undefined,
      sort_by: p.sortBy || undefined,
    };

    ctx.log("info", "listing PagerDuty incidents", { returnAll, limit });

    return await client.requestAll(
      "/incidents",
      "incidents",
      { query },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
