import type { ActionDefinition } from "@w6w/types";
import { compact, PodiumClient, toList } from "../lib/client.ts";

interface Input {
  url: string;
  eventTypes: string[] | string;
  locationUid?: string;
  organizationUid?: string;
  secret?: string;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Subscribe a URL to Podium events for a location or organization. The signing `secret` is write-only here: Podium echoes it back in every webhook object and this action removes it from the result. Requires scope `(depends on the event types)`.",
  idempotent: false,
  params: [{
    key: "url",
    label: "URL",
    type: "string",
    required: true,
    hint: "HTTPS endpoint that receives the events.",
  }, {
    key: "eventTypes",
    label: "Event types",
    type: "string",
    required: true,
    hint:
      "Comma-separated, e.g. `message.received,review.created`. Allowed: call.completed, call.missed, call.received, call.voicemail_left, contact.created, contact.deleted, contact.merged, contact.unchanged, contact.updated, invoice.created, invoice.disabled, invoice.marked_as_paid, invoice.payment_created, invoice.payment_failed, invoice.payment_succeeded, invoice.refund_created, invoice.refund_failed, message.failed, message.received, message.sent, review.created, review.invite_link_created, review.invite_link_updated, review.response_created, review.response_updated, review.updated",
  }, {
    key: "locationUid",
    label: "Location UID",
    type: "string",
    hint: "One of Location UID / Organization UID is required.",
  }, {
    key: "organizationUid",
    label: "Organization UID",
    type: "string",
    hint: "Wins when both are given.",
  }, {
    key: "secret",
    label: "Signing secret",
    type: "secret",
    hint: "Used to sign events; see the Podium webhook-signature guide.",
  }],
  output: [{
    key: "createdAt",
    type: "string",
    label: "When the webhook was created",
  }, {
    key: "disabled",
    type: "boolean",
    label: "Whether the webhook is disabled or not",
  }, {
    key: "eventTypes",
    type: "array",
    label: "eventTypes",
  }, {
    key: "locationUid",
    type: "string",
    label: "Podium unique identifier for location",
  }, {
    key: "organizationUid",
    type: "string",
    label: "Podium unique identifier for location",
  }, {
    key: "uid",
    type: "string",
    label: "Podium unique identifier for webhook",
  }, {
    key: "updatedAt",
    type: "string",
    label: "When the webhook was last updated",
  }, {
    key: "url",
    type: "string",
    label: "URL that webhook events will be sent to",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one("/webhooks", {
      method: "POST",
      body: compact({
        url: input.url,
        eventTypes: toList(input.eventTypes),
        locationUid: input.locationUid,
        organizationUid: input.organizationUid,
        secret: input.secret,
      }),
      redact: ["secret"],
    });
  },
};

export default webhookCreate;
