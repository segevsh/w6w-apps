import type { ActionDefinition } from "@w6w/types";
import { compact, HeyReachClient, numberList } from "../lib/client.ts";

interface Input {
  webhookName: string;
  webhookUrl: string;
  eventType: string;
  campaignIds?: number[] | string;
}

/**
 * `POST /api/public/webhooks/CreateWebhook` — register a webhook.
 *
 * ## The body comes from the operation's prose, not its schema
 *
 * The document's `requestBody` here is a bare `{"type":"string"}` — a generator
 * artifact — while the operation's `description` sets out the body *and* the
 * complete `eventType` vocabulary in a worked example. That is what the option
 * list below is copied from, verbatim; no value was invented. There is no
 * response schema either ("Successful response", no content), so the action
 * returns the status and nothing else: read the new webhook back with
 * `webhook-list` to get its `id`.
 *
 * ## Not idempotent
 *
 * Nothing in the body deduplicates a subscription, so a retried step registers a
 * second webhook — and a duplicate webhook is not a harmless duplicate: every
 * subscribed event is delivered twice, forever. `idempotent: false`.
 *
 * ## An empty `campaignIds` means "all campaigns"
 *
 * That is the document's own wording, so the field is left out entirely rather
 * than sent as `[]` — the practical meaning is the same and the omission is
 * clearer about which one you meant.
 */
const action: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Register a webhook for one HeyReach event type, optionally limited to specific campaigns " +
    "(POST /api/public/webhooks/CreateWebhook).",
  idempotent: false,
  params: [
    {
      key: "webhookName",
      label: "Webhook name",
      type: "string",
      required: true,
      hint: "A label for this subscription.",
    },
    {
      key: "webhookUrl",
      label: "Webhook URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/hooks/heyreach",
      hint: "HeyReach POSTs each event here.",
    },
    {
      key: "eventType",
      label: "Event type",
      type: "select",
      required: true,
      options: [
        { value: "CONNECTION_REQUEST_SENT", label: "Connection request sent" },
        { value: "CONNECTION_REQUEST_ACCEPTED", label: "Connection request accepted" },
        { value: "MESSAGE_SENT", label: "Message sent" },
        { value: "MESSAGE_REPLY_RECEIVED", label: "Message reply received (first reply only)" },
        { value: "INMAIL_SENT", label: "InMail sent" },
        { value: "INMAIL_REPLY_RECEIVED", label: "InMail reply received (first reply only)" },
        {
          value: "EVERY_MESSAGE_REPLY_RECEIVED",
          label: "Every message reply received (messages and InMails)",
        },
        { value: "FOLLOW_SENT", label: "Follow sent" },
        { value: "LIKED_POST", label: "Post liked" },
        { value: "VIEWED_PROFILE", label: "Profile viewed" },
        { value: "CAMPAIGN_COMPLETED", label: "Campaign completed" },
        { value: "LEAD_TAG_UPDATED", label: "Lead tag updated" },
      ],
      hint: "The full list is the one HeyReach's own documentation enumerates for this endpoint.",
    },
    {
      key: "campaignIds",
      label: "Campaigns",
      type: "array",
      item: { type: "number" },
      hint: "Leave empty to listen across all campaigns.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (200 on success)" }],

  async execute(input, ctx) {
    const status = await new HeyReachClient(ctx).status("/webhooks/CreateWebhook", {
      method: "POST",
      body: compact({
        webhookName: input.webhookName,
        webhookUrl: input.webhookUrl,
        eventType: input.eventType,
        campaignIds: numberList(input.campaignIds, "Campaigns"),
      }),
    });
    return { status };
  },
};

export default action;
