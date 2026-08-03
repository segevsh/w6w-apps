import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { limitParam, type PageLimitInput, pageParam } from "../lib/params.ts";

/**
 * GET /webhooks — the account's webhook subscriptions.
 *
 * Keyed `webhooks`, not `items`, and its `limit` caps at 100 rather than the
 * 500 the form endpoints allow.
 */
const webhookGetMany: ActionDefinition<PageLimitInput, Record<string, unknown>> = {
  key: "webhook-get-many",
  type: "search",
  resource: "webhook",
  title: "Get Many Webhooks",
  description: "List the webhook subscriptions on this account.",
  params: [pageParam, limitParam(100)],
  output: [
    { key: "webhooks", type: "array", label: "Webhooks" },
    { key: "page", type: "number", label: "Current page" },
    { key: "limit", type: "number", label: "Items per page" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
  ],

  async execute(input, ctx) {
    const body = await new TallyClient(ctx).request<{
      webhooks?: unknown[];
      page?: number;
      limit?: number;
      hasMore?: boolean;
    }>("/webhooks", { query: { page: input.page, limit: input.limit } });
    return {
      webhooks: body?.webhooks ?? [],
      page: body?.page,
      limit: body?.limit,
      hasMore: body?.hasMore,
    };
  },
};

export default webhookGetMany;
