import type { ActionDefinition } from "@w6w/types";
import {
  ChargebeeClient,
  type ChargebeeList,
  filterDateRange,
  filterIs,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  SORT_ORDER_PARAM,
  sortBy,
} from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: string;
  eventType?: string;
  webhookStatus?: string;
  source?: string;
  occurredAfter?: number;
  occurredBefore?: number;
  sortOrder?: "asc" | "desc";
}

/**
 * `GET /events` — offset-cursor list of events.
 *
 * An event is Chargebee's record of something that happened, and it is the same
 * object a webhook delivers. Polling it is how a workflow catches up on what
 * changed without standing up a webhook endpoint — including, via
 * `webhook_status`, what Chargebee *tried* to deliver and could not.
 *
 * `event_type` is a free-text field rather than a select on purpose: Chargebee
 * documents over two hundred values (`subscription_created`, `payment_failed`,
 * `invoice_generated`, and on through omnichannel, entitlement and ledger
 * events). A dropdown of that would be unusable and would go stale the moment
 * Chargebee adds one; the hint names the ones a billing workflow actually
 * watches and points at the canonical list.
 *
 * `sort_by` on this endpoint accepts ONLY `occurred_at` — not `created_at` or
 * `updated_at`. So this action exposes a direction and hard-codes the attribute,
 * rather than offering a choice the endpoint would reject.
 */
const OCCURRED_AT = "occurred_at";

const listEvents: ActionDefinition<Input> = {
  key: "list-events",
  type: "search",
  resource: "event",
  title: "List Events",
  description:
    "List Chargebee events — the same records webhooks deliver — filtered by type, source, " +
    "webhook delivery status or when they occurred.",
  params: [
    ...PAGE_PARAMS,
    {
      key: "eventType",
      label: "Event type",
      type: "string",
      placeholder: "subscription_created",
      hint: "Exact match. Common values: `customer_created`, `subscription_created`, " +
        "`subscription_changed`, `subscription_cancelled`, `subscription_renewed`, " +
        "`invoice_generated`, `payment_succeeded`, `payment_failed`, `payment_refunded`. " +
        "Chargebee documents 200-plus types in its Event Types reference.",
    },
    {
      key: "webhookStatus",
      label: "Webhook status",
      type: "select",
      options: [
        { value: "not_configured", label: "Not configured" },
        { value: "scheduled", label: "Scheduled" },
        { value: "succeeded", label: "Succeeded" },
        { value: "re_scheduled", label: "Re-scheduled" },
        { value: "failed", label: "Failed" },
        { value: "skipped", label: "Skipped" },
        { value: "not_applicable", label: "Not applicable" },
        { value: "disabled", label: "Disabled" },
        { value: "rate_limited", label: "Rate limited" },
      ],
      hint: "Filter to `failed` to find deliveries a webhook consumer never received.",
    },
    {
      key: "source",
      label: "Source",
      type: "select",
      options: [
        { value: "admin_console", label: "Admin console" },
        { value: "api", label: "API" },
        { value: "scheduled_job", label: "Scheduled job" },
        { value: "hosted_page", label: "Hosted page" },
        { value: "portal", label: "Customer portal" },
        { value: "system", label: "System" },
        { value: "js_api", label: "JS API" },
        { value: "migration", label: "Migration" },
        { value: "bulk_operation", label: "Bulk operation" },
        { value: "external_service", label: "External service" },
        { value: "none", label: "None" },
      ],
      hint: "What caused the event. Useful to ignore changes your own integration made.",
    },
    {
      key: "occurredAfter",
      label: "Occurred after",
      type: "number",
      hint: "Unix epoch seconds.",
      validation: { integer: true },
    },
    {
      key: "occurredBefore",
      label: "Occurred before",
      type: "number",
      hint: "Unix epoch seconds.",
      validation: { integer: true },
    },
    {
      ...SORT_ORDER_PARAM,
      // No default: leaving it blank sends no `sort_by` at all, so Chargebee's
      // own ordering stands rather than this App quietly imposing one.
      default: undefined,
      hint:
        "Events sort by occurrence time; only the direction is selectable. Leave blank to keep " +
        "Chargebee's default ordering.",
    },
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return ChargebeeClient.fromConnection(ctx).request<ChargebeeList>("/events", {
      query: {
        limit: input.limit,
        offset: input.offset,
        event_type: filterIs(input.eventType),
        webhook_status: filterIs(input.webhookStatus),
        source: filterIs(input.source),
        occurred_at: filterDateRange(input.occurredAfter, input.occurredBefore),
        sort_by: input.sortOrder ? sortBy(OCCURRED_AT, input.sortOrder) : undefined,
      },
    });
  },
};

export default listEvents;
