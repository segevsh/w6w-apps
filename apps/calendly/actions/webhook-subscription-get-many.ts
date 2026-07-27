import type { ActionDefinition } from "@w6w/types";
import { CalendlyClient } from "../lib/client.ts";

interface Input {
  scope: "user" | "organization";
  organization: string;
  user?: string;
  count?: number;
  pageToken?: string;
}

/**
 * GET /webhook_subscriptions — the webhooks registered for a scope. Calendly
 * requires `scope` and `organization`; when `scope` is `user`, `user` is required
 * too.
 */
const webhookSubscriptionGetMany: ActionDefinition<Input> = {
  key: "webhook-subscription-get-many",
  type: "read",
  resource: "webhook-subscription",
  title: "List Webhook Subscriptions",
  description: "List registered webhooks for a scope (GET /webhook_subscriptions).",
  params: [
    {
      key: "scope",
      label: "Scope",
      type: "select",
      required: true,
      default: "organization",
      options: [
        { value: "organization", label: "Organization" },
        { value: "user", label: "User" },
      ],
    },
    {
      key: "organization",
      label: "Organization URI",
      type: "string",
      required: true,
      hint: "e.g. https://api.calendly.com/organizations/BBBB.",
    },
    {
      key: "user",
      label: "User URI",
      type: "string",
      hint: "Required when Scope is User — e.g. https://api.calendly.com/users/AAAA.",
    },
    {
      key: "count",
      label: "Count",
      type: "number",
      hint: "Rows per page (1–100, default 20).",
      validation: { min: 1, max: 100, integer: true },
    },
    { key: "pageToken", label: "Page token", type: "string", advanced: true },
  ],
  output: [
    { key: "collection", type: "array", label: "Webhook subscriptions" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    return new CalendlyClient(ctx).request("/webhook_subscriptions", {
      query: {
        scope: input.scope,
        organization: input.organization,
        user: input.scope === "user" ? input.user : undefined,
        count: input.count,
        page_token: input.pageToken,
      },
    });
  },
};

export default webhookSubscriptionGetMany;
