import type { ActionDefinition } from "@w6w/types";
import { compact, MailerSendClient, redactSecrets, seg, toList } from "../lib/client.ts";

interface Input {
  webhookId: string;
  name?: string;
  url?: string;
  events?: unknown;
  enabled?: boolean;
  version?: number;
}

/** Every event type the Webhooks page lists. */
export const WEBHOOK_EVENTS = [
  "activity.sent",
  "activity.delivered",
  "activity.soft_bounced",
  "activity.hard_bounced",
  "activity.deferred",
  "activity.opened",
  "activity.opened_unique",
  "activity.clicked",
  "activity.clicked_unique",
  "activity.unsubscribed",
  "activity.spam_complaint",
  "activity.suppressed",
  "activity.survey_opened",
  "activity.survey_submitted",
  "sender_identity.verified",
  "maintenance.start",
  "maintenance.end",
  "inbound_forward.failed",
  "inbound_message.rejected",
  "email_single.verified",
  "email_list.verified",
  "bulk_email.completed",
  "recipient.on_hold_added",
  "recipient.on_hold_removed",
];

const updateWebhook: ActionDefinition<Input> = {
  key: "update-webhook",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description:
    "Change a webhook (PUT /v1/webhooks/{id}); only the fields you set are sent. Changing the URL triggers the same `webhook.test` ping as creation. Pass `enabled: false` to pause deliveries.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", hint: "Max 50 characters." },
    { key: "url", label: "URL", type: "string" },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      options: WEBHOOK_EVENTS.map((v) => ({ value: v, label: v })),
      hint: "Replaces the whole event list.",
    },
    { key: "enabled", label: "Enabled", type: "boolean" },
    {
      key: "version",
      label: "Payload version",
      type: "select",
      options: [{ value: 2, label: "2 (recommended)" }, { value: 1, label: "1 (legacy)" }],
    },
  ],
  output: [{ key: "data", type: "object", label: "The updated webhook" }],

  async execute(input, ctx) {
    return redactSecrets(
      await new MailerSendClient(ctx).json(`/webhooks/${seg(input.webhookId)}`, {
        method: "PUT",
        body: compact({
          name: input.name,
          url: input.url,
          events: toList(input.events),
          enabled: input.enabled,
          version: input.version === undefined ? undefined : Number(input.version),
        }),
      }),
    );
  },
};

export default updateWebhook;
