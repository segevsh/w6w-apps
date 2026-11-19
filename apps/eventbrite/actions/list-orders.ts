import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "../lib/client.ts";
import { resolveEventbriteFields } from "../lib/fields.ts";
import { toEventbriteTime } from "../lib/time.ts";
import { ORDER_EXPANSIONS } from "../lib/expansions.ts";
import { pageParam, pageQuery, pageSizeParam, pageSizeQuery } from "../lib/paging.ts";
import {
  ATTENDEE_SAMPLE,
  ORDER_LIST_ITEM_OUTPUT,
  ORDER_SAMPLE,
  PAGINATION_CONTINUATION_OUTPUT,
  PAGINATION_CONTINUATION_SAMPLE,
} from "../lib/outputs.ts";

interface Input {
  scope: "event" | "organization" | "user";
  scopeId: string;
  status?: string;
  changedSince?: string;
  timeFilter?: string;
  onlyEmails?: string;
  excludeEmails?: string;
  expand?: string;
  /** Event and Organization scope only: the user endpoint answers 400 to `page_size`. */
  pageSize?: number;
  page?: number;
  continuation?: string;
}

const DEFAULT_EXPAND =
  "attendees,ticket_buyer_settings,contact_list_preferences,answers,survey_responses,survey,refund_requests";

/**
 * The `status` query for the scope. The user endpoint takes none; the organization endpoint
 * answers 400 `"both" is not a valid choice` (measured 2026-11-17, though the API reference lists
 * it), so "All orders" reads `all_not_deleted` there.
 */
function orderStatus(scope: Input["scope"], status: string | undefined): string | undefined {
  if (scope === "user" || !status) return undefined;
  if (scope === "organization" && status === "both") return "all_not_deleted";
  return status;
}

const listOrders: ActionDefinition<Input> = {
  key: "list-orders",
  type: "read",
  resource: "order",
  title: "List Orders",
  description: "List orders for an event, an organization, or a user.",
  params: [
    {
      key: "scope",
      row: "scope",
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
      row: "scope",
      label: "Scope ID",
      type: "string",
      required: true,
      hint:
        "Event ID when scope is `event`, organization ID when scope is `organization`, user ID when scope is `user`.",
      options: { source: "resolveFields", refreshOn: ["scope"] },
      config: { allowCustom: true },
      when: [
        { if: { field: "scope", equals: "event" }, set: { label: "Event ID" } },
        { if: { field: "scope", equals: "organization" }, set: { label: "Organization ID" } },
        { if: { field: "scope", equals: "user" }, set: { label: "User ID" } },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      placeholder: "Select…",
      showIf: { field: "scope", notIn: ["user"] },
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "both", label: "All orders" },
        { value: "all_not_deleted", label: "All non-deleted orders" },
      ],
      hint:
        "Filter by attending orders, non-attending orders, all orders, or all non-deleted orders. With Organization scope, All orders reads all non-deleted orders (that endpoint refuses `both`).",
    },
    { key: "changedSince", label: "Changed since (ISO datetime)", type: "string" },
    {
      key: "timeFilter",
      label: "Time filter",
      type: "select",
      hint: "Only used when scope is `user`.",
      showIf: { field: "scope", equals: "user" },
      options: [
        { value: "all", label: "All" },
        { value: "past", label: "Past" },
        { value: "current_future", label: "Current and future" },
      ],
    },
    {
      key: "onlyEmails",
      row: "emails",
      label: "Only emails (comma-separated)",
      type: "string",
      showIf: { field: "scope", notIn: ["user"] },
    },
    {
      key: "excludeEmails",
      row: "emails",
      label: "Exclude emails (comma-separated)",
      type: "string",
      showIf: { field: "scope", notIn: ["user"] },
    },
    {
      key: "expand",
      label: "Expand",
      type: "multiselect",
      options: ORDER_EXPANSIONS,
      config: { valueFormat: "csv" },
      default: DEFAULT_EXPAND,
    },
    pageSizeParam({
      hint:
        "Orders per page, 1–200. Eventbrite returns 50 when blank. Event and Organization scope.",
      showIf: { field: "scope", notIn: ["user"] },
    }),
    pageParam(),
    { key: "continuation", label: "Continuation token", type: "string" },
  ],
  resolveFields: resolveEventbriteFields,
  output: [
    { key: "orders", type: "array", label: "Orders", items: ORDER_LIST_ITEM_OUTPUT },
    ...PAGINATION_CONTINUATION_OUTPUT,
  ],
  sample: {
    orders: [{ ...ORDER_SAMPLE, attendees: [ATTENDEE_SAMPLE] }],
    pagination: PAGINATION_CONTINUATION_SAMPLE,
  },

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
        status: orderStatus(input.scope, input.status),
        changed_since: toEventbriteTime(input.changedSince),
        time_filter: input.scope === "user" ? input.timeFilter : undefined,
        only_emails: input.scope === "user" ? undefined : input.onlyEmails,
        exclude_emails: input.scope === "user" ? undefined : input.excludeEmails,
        expand: input.expand ?? DEFAULT_EXPAND,
        page_size: input.scope === "user" ? undefined : pageSizeQuery(input.pageSize),
        page: pageQuery(input.page),
        continuation: input.continuation,
      },
    });
  },
};

export default listOrders;
