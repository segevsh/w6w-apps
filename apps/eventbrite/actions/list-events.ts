import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "../lib/client.ts";

interface Input {
  scope?: "organization" | "venue" | "series";
  scopeId?: string;
  /** Legacy alias for `scopeId` when scope is `organization`. */
  organizationId?: string;
  status?: string;
  nameFilter?: string;
  timeFilter?: "current_future" | "past" | "all";
  showSeriesParent?: boolean;
  orderBy?: string;
  onlyPublic?: boolean;
  startDateRangeStart?: string;
  startDateRangeEnd?: string;
  pageSize?: number;
  continuation?: string;
  expand?: string;
}

const listEvents: ActionDefinition<Input> = {
  key: "list-events",
  type: "read",
  resource: "event",
  title: "List Events",
  description:
    "List events for an organization (default), a venue, or an event series. Walks one page; pass back `continuation` to get the next.",
  params: [
    {
      key: "scope",
      label: "Scope",
      type: "select",
      default: "organization",
      options: [
        { value: "organization", label: "Organization" },
        { value: "venue", label: "Venue" },
        { value: "series", label: "Event series" },
      ],
    },
    {
      key: "scopeId",
      label: "Scope ID",
      type: "string",
      hint:
        "Organization, venue or event series ID depending on scope. For `organization` you may use Organization ID instead.",
    },
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      hint: "Same as Scope ID when scope is `organization`.",
    },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint:
        "Comma-separated, e.g. `live,draft`. Organization: defaults to `live`. Venue: optional. Ignored for series.",
      default: "live",
    },
    { key: "nameFilter", label: "Name filter", type: "string", hint: "Organization scope only." },
    {
      key: "timeFilter",
      label: "Time filter",
      type: "select",
      hint: "Organization and series scopes.",
      options: [
        { value: "current_future", label: "Current + future" },
        { value: "past", label: "Past" },
        { value: "all", label: "All" },
      ],
    },
    {
      key: "showSeriesParent",
      label: "Include series parents",
      type: "boolean",
      default: false,
      hint: "Organization scope only.",
    },
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: [
        { value: "start_asc", label: "Start ascending" },
        { value: "start_desc", label: "Start descending" },
        { value: "created_asc", label: "Created ascending" },
        { value: "created_desc", label: "Created descending" },
        { value: "name_asc", label: "Name ascending (organization only)" },
        { value: "name_desc", label: "Name descending (organization only)" },
      ],
    },
    { key: "onlyPublic", label: "Only public events", type: "boolean", hint: "Venue scope only." },
    {
      key: "startDateRangeStart",
      label: "Start date range start",
      type: "string",
      hint: "ISO datetime. Series scope only.",
    },
    {
      key: "startDateRangeEnd",
      label: "Start date range end",
      type: "string",
      hint: "ISO datetime. Series scope only.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 100,
      hint: "Organization scope.",
    },
    { key: "continuation", label: "Continuation token", type: "string" },
    { key: "expand", label: "Expand", type: "string", default: "venue,ticket_classes" },
  ],
  output: [
    { key: "events", type: "array", label: "Events" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],
  idempotent: true,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const scope = input.scope ?? "organization";
    const id = encodeURIComponent((input.scopeId ?? input.organizationId ?? "") as string);
    if (!id) throw new Error("list-events: scopeId (or organizationId) is required");
    const common = {
      order_by: input.orderBy,
      continuation: input.continuation,
      expand: input.expand ?? "venue,ticket_classes",
    };

    if (scope === "venue") {
      return client.request<EventbriteListResponse<"events">>(`/venues/${id}/events/`, {
        query: {
          ...common,
          status: input.status,
          only_public: input.onlyPublic,
          page_size: input.pageSize,
        },
      });
    }
    if (scope === "series") {
      return client.request<EventbriteListResponse<"events">>(`/series/${id}/events/`, {
        query: {
          ...common,
          time_filter: input.timeFilter,
          "start_date.range_start": input.startDateRangeStart,
          "start_date.range_end": input.startDateRangeEnd,
        },
      });
    }
    return client.request<EventbriteListResponse<"events">>(`/organizations/${id}/events/`, {
      query: {
        ...common,
        status: input.status ?? "live",
        name_filter: input.nameFilter,
        time_filter: input.timeFilter,
        show_series_parent: input.showSeriesParent,
        page_size: input.pageSize ?? 100,
      },
    });
  },
};

export default listEvents;
