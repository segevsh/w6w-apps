import type { ActionDefinition } from "@w6w/types";
import { stripWebhookSecret, unset, WebexClient } from "../lib/client.ts";

const RESOURCES = [
  "attachmentActions",
  "dataSources",
  "memberships",
  "messages",
  "rooms",
  "meetings",
  "recordings",
  "convergedRecordings",
  "meetingParticipants",
  "meetingTranscripts",
  "telephony_calls",
  "telephony_conference",
  "telephony_mwi",
  "uc_counters",
  "serviceApp",
  "adminBatchJobs",
];

const EVENTS = [
  "created",
  "updated",
  "deleted",
  "started",
  "ended",
  "joined",
  "left",
  "migrated",
  "authorized",
  "deauthorized",
  "statusChanged",
];

interface Input {
  name: string;
  targetUrl: string;
  resource: string;
  event: string;
  filter?: string;
  secret?: string;
  ownedByOrg?: boolean;
}

const createWebhook: ActionDefinition<Input> = {
  key: "create-webhook",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Subscribe a target URL to a resource/event pair. Creating a webhook requires " +
    "'read' scope on the resource it is for.",
  // Webex mints a new webhook id per call and takes no request key.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "targetUrl", label: "Target URL", type: "string", required: true },
    {
      key: "resource",
      label: "Resource",
      type: "select",
      required: true,
      options: RESOURCES.map((v) => ({ value: v, label: v })),
    },
    {
      key: "event",
      label: "Event",
      type: "select",
      required: true,
      options: EVENTS.map((v) => ({ value: v, label: v })),
    },
    {
      key: "filter",
      label: "Filter",
      type: "string",
      advanced: true,
      hint: 'Scopes the webhook, e.g. "roomId=<id>". See the Webhooks guide for the filter ' +
        "grammar per resource.",
    },
    {
      key: "secret",
      label: "Secret",
      type: "secret",
      advanced: true,
      hint: "Used to HMAC-sign each delivered payload so the receiver can verify it.",
    },
    {
      key: "ownedByOrg",
      label: "Org-level webhook",
      type: "boolean",
      advanced: true,
      hint: "Admin-level webhook, supported for a subset of resources (meetings, recordings, " +
        "telephony, and related).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "resource", type: "string", label: "Resource" },
    { key: "event", type: "string", label: "Event" },
  ],

  async execute(input, ctx) {
    const webhook = await new WebexClient(ctx).request("/webhooks", {
      method: "POST",
      body: {
        name: input.name,
        targetUrl: input.targetUrl,
        resource: input.resource,
        event: input.event,
        filter: unset(input.filter),
        secret: unset(input.secret),
        ownedBy: input.ownedByOrg ? "org" : undefined,
      },
    });
    // See stripWebhookSecret: even though the caller supplied this secret,
    // Webex's own create response echoes it back — stripped for the same
    // reason a read never returns one.
    return stripWebhookSecret(webhook);
  },
};

export default createWebhook;
