import type { ActionDefinition } from "@w6w/types";
import {
  type Page,
  type PageInput,
  pageOutput,
  pageParams,
  pageQuery,
  PracticeBetterClient,
} from "../lib/client.ts";

/**
 * `GET /webhooks/subscription` — list webhook subscriptions.
 *
 * Security: `[read]`.
 *
 * This endpoint's **filters are its own**, not the shared pagination family:
 * `eventType`, `isActive` and `status` — each a single value, with no id lists
 * and no date window. Its response is still the `{count, hasMore, items}`
 * envelope every list endpoint in this API answers with, so the pagination
 * *inputs* are the shared four while the extra filters are declared here.
 */
interface Input extends PageInput {
  eventType?: string;
  isActive?: boolean;
  status?: string;
}

const listWebhookSubscriptions: ActionDefinition<Input, Page<unknown>> = {
  key: "list-webhook-subscriptions",
  type: "search",
  resource: "webhook-subscription",
  title: "List Webhook Subscriptions",
  description:
    "List webhook subscriptions, filtered by event type, active flag and status. This endpoint's " +
    "filters are its own, not the standard id/date set the other lists take.",
  params: [
    ...pageParams,
    {
      key: "eventType",
      label: "Event type",
      type: "string",
      hint:
        "Filter to subscriptions carrying this event type. Use `list-webhook-event-types` for " +
        "the valid values.",
    },
    {
      key: "isActive",
      label: "Active",
      type: "boolean",
      hint: "Filter by whether the subscription is active.",
    },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "Filter by the subscription's status value.",
    },
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new PracticeBetterClient(ctx).list("/webhooks/subscription", {
      query: {
        ...pageQuery(input),
        eventType: input.eventType,
        isActive: input.isActive,
        status: input.status,
      },
    });
  },
};

export default listWebhookSubscriptions;
