import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "../lib/client.ts";

interface Input {
  scope: "event" | "organization" | "user";
  scopeId: string;
  status?: string;
  changedSince?: string;
  timeFilter?: string;
  onlyEmails?: string;
  excludeEmails?: string;
  expand?: string;
  pageSize?: number;
  continuation?: string;
}

const DEFAULT_EXPAND =
  "attendees,ticket_buyer_settings,contact_list_preferences,answers,survey_responses,survey,refund_requests";

const listOrders: ActionDefinition<Input> = {
  key: "list-orders",
  type: "read",
  resource: "order",
  title: "List Orders",
  description: "List orders for an event, an organization, or a user.",
  params: [
    {
      key: "scope",
      label: "Scope",
      type: "select",
      required: true,
      default: "event",
      options: [
        { value: "event", label: "Event" },
        { value: "organization", label: "Organization" },
        { value: "user", label: "User" },
      ],
    },
    {
      key: "scopeId",
      label: "Scope ID",
      type: "string",
      required: true,
      hint:
        "Event ID when scope is `event`, organization ID when scope is `organization`, user ID when scope is `user`.",
    },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "e.g. `placed`, `refunded`, `transferred`.",
    },
    { key: "changedSince", label: "Changed since (ISO datetime)", type: "string" },
    {
      key: "timeFilter",
      label: "Time filter",
      type: "select",
      hint: "Only used when scope is `user`.",
      options: [
        { value: "all", label: "All" },
        { value: "past", label: "Past" },
        { value: "current_future", label: "Current and future" },
      ],
    },
    { key: "onlyEmails", label: "Only emails (comma-separated)", type: "string" },
    { key: "excludeEmails", label: "Exclude emails (comma-separated)", type: "string" },
    { key: "expand", label: "Expand", type: "string", default: DEFAULT_EXPAND },
    { key: "pageSize", label: "Page size", type: "number", default: 50 },
    { key: "continuation", label: "Continuation token", type: "string" },
  ],
  output: [
    { key: "orders", type: "array", label: "Orders" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const id = encodeURIComponent(input.scopeId);
    const path = input.scope === "organization"
      ? `/organizations/${id}/orders/`
      : input.scope === "user"
      ? `/users/${id}/orders/`
      : `/events/${id}/orders/`;
    return client.request<EventbriteListResponse<"orders">>(path, {
      query: {
        status: input.status,
        changed_since: input.changedSince,
        time_filter: input.scope === "user" ? input.timeFilter : undefined,
        only_emails: input.onlyEmails,
        exclude_emails: input.excludeEmails,
        expand: input.expand ?? DEFAULT_EXPAND,
        page_size: input.pageSize ?? 50,
        continuation: input.continuation,
      },
    });
  },
};

export default listOrders;
