import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { type PageInput, pageParam } from "../lib/params.ts";

interface Input extends PageInput {
  webhookId: string;
}

/**
 * GET /webhooks/{webhookId}/events — the delivery log for one subscription.
 *
 * This is the debugging surface: each entry records the target URL and the
 * outcome, so a failed delivery can be found and replayed with Retry Webhook
 * Event. Keyed `events`, with `totalNumberOfEvents`; the page size is fixed at
 * 25 by the server and there is no `limit` param.
 */
const webhookEventGetMany: ActionDefinition<Input, Record<string, unknown>> = {
  key: "webhook-event-get-many",
  type: "search",
  resource: "webhook-event",
  title: "Get Many Webhook Events",
  description: "List a webhook's delivery attempts. Pages are fixed at 25 events.",
  params: [
    {
      key: "webhookId",
      label: "Webhook ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Webhooks.",
    },
    pageParam,
  ],
  output: [
    { key: "events", type: "array", label: "Delivery attempts" },
    { key: "page", type: "number", label: "Current page" },
    { key: "limit", type: "number", label: "Events per page (25)" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
    { key: "totalNumberOfEvents", type: "number", label: "Total events" },
  ],

  async execute(input, ctx) {
    const body = await new TallyClient(ctx).request<{
      events?: unknown[];
      page?: number;
      limit?: number;
      hasMore?: boolean;
      totalNumberOfEvents?: number;
    }>(`/webhooks/${encodeURIComponent(input.webhookId)}/events`, {
      query: { page: input.page },
    });
    return {
      events: body?.events ?? [],
      page: body?.page,
      limit: body?.limit,
      hasMore: body?.hasMore,
      totalNumberOfEvents: body?.totalNumberOfEvents,
    };
  },
};

export default webhookEventGetMany;
