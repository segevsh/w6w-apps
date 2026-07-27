import type { ActionDefinition } from "@w6w/types";
import { CalendlyClient } from "../lib/client.ts";

interface Input {
  url: string;
  events: string[];
  organization: string;
  scope: "user" | "organization";
  user?: string;
  signingKey?: string;
}

/**
 * POST /webhook_subscriptions — register a webhook. `organization` is always
 * required; when `scope` is `user`, `user` is required too so Calendly knows
 * which member's events to forward. `signing_key` is optional and lets you verify
 * the delivered payloads.
 */
const webhookSubscriptionCreate: ActionDefinition<Input> = {
  key: "webhook-subscription-create",
  type: "perform",
  resource: "webhook-subscription",
  title: "Create Webhook Subscription",
  description: "Subscribe a URL to Calendly events (POST /webhook_subscriptions).",
  idempotent: false,
  params: [
    {
      key: "url",
      label: "Callback URL",
      type: "string",
      required: true,
      hint: "HTTPS endpoint Calendly will POST events to.",
    },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      required: true,
      hint: "Which event types to receive.",
      options: [
        { value: "invitee.created", label: "Invitee created" },
        { value: "invitee.canceled", label: "Invitee canceled" },
        { value: "invitee_no_show.created", label: "Invitee no-show created" },
        { value: "invitee_no_show.deleted", label: "Invitee no-show deleted" },
        { value: "routing_form_submission.created", label: "Routing form submission created" },
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
      key: "user",
      label: "User URI",
      type: "string",
      hint: "Required when Scope is User — e.g. https://api.calendly.com/users/AAAA.",
    },
    {
      key: "signingKey",
      label: "Signing key",
      type: "secret",
      advanced: true,
      hint: "Optional. Used to sign payloads so you can verify their origin.",
    },
  ],
  output: [
    { key: "resource", type: "object", label: "Webhook subscription" },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = {
      url: input.url,
      events: input.events,
      organization: input.organization,
      scope: input.scope,
    };
    if (input.scope === "user" && input.user) body.user = input.user;
    if (input.signingKey) body.signing_key = input.signingKey;
    return new CalendlyClient(ctx).request("/webhook_subscriptions", { method: "POST", body });
  },
};

export default webhookSubscriptionCreate;
