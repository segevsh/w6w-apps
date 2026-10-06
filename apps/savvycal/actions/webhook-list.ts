import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  type Page,
  pagingParams,
  SavvyCalClient,
  stripWebhookSecret,
} from "../lib/client.ts";

interface Input {
  limit?: number;
  after?: string;
  before?: string;
}

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description:
    "List the authenticated user's webhooks. The signing `secret` the API returns on each " +
    "webhook is removed from the output.",
  params: [...pagingParams],
  output: [
    { key: "entries", type: "array", label: "Webhooks (without secrets)" },
    { key: "metadata", type: "object", label: "Cursors: after, before, limit" },
  ],

  async execute(input, ctx) {
    const page = await new SavvyCalClient(ctx).json<Page<unknown>>("/webhooks", {
      query: compact({ limit: input.limit, after: input.after, before: input.before }) as Record<
        string,
        string
      >,
    });
    return { ...page, entries: (page?.entries ?? []).map(stripWebhookSecret) };
  },
};

export default webhookList;
