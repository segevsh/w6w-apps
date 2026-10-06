import type { ActionDefinition, Param } from "@w6w/types";
import { compact, KudosityClient } from "../lib/client.ts";

export const EVENT_TYPES = [
  "SMS_STATUS",
  "SMS_INBOUND",
  "MMS_STATUS",
  "MMS_INBOUND",
  "WHATSAPP_STATUS",
  "WHATSAPP_INBOUND",
  "RCS_STATUS",
  "RCS_INBOUND",
  "LINK_HIT",
  "OPT_OUT",
];

export interface WebhookInput {
  name: string;
  url: string;
  eventTypes?: string[];
  senders?: string[];
  statuses?: string[];
  messageRefs?: string[];
  campaignIds?: string[];
  rateLimit?: number;
}

/** Shared by create and update — both take the same body. */
export const WEBHOOK_PARAMS: Param[] = [
  { key: "name", label: "Name", type: "string", required: true },
  {
    key: "url",
    label: "URL",
    type: "string",
    required: true,
    hint: "HTTPS endpoint that accepts JSON POSTs.",
  },
  {
    key: "eventTypes",
    label: "Event types",
    type: "multiselect",
    options: EVENT_TYPES.map((e) => ({ value: e, label: e })),
    hint: "Events to subscribe to. Sent as filter.event_type (the top-level event_type field is " +
      "deprecated by the vendor).",
  },
  {
    key: "senders",
    label: "Only these senders",
    type: "json",
    hint: "JSON array. Outbound events match the sender; inbound events match the number that " +
      'received the reply. e.g. ["61412345678"].',
  },
  {
    key: "statuses",
    label: "Only these statuses",
    type: "json",
    hint: 'JSON array, status events only, e.g. ["DELIVERED", "FAILED"].',
  },
  { key: "messageRefs", label: "Only these message references", type: "json", hint: "JSON array." },
  { key: "campaignIds", label: "Only these campaign IDs", type: "json", hint: "JSON array." },
  {
    key: "rateLimit",
    label: "Rate limit",
    type: "number",
    hint: "Maximum deliveries per second to your endpoint.",
    validation: { min: 1, integer: true },
  },
];

function list(v: string[] | string | undefined): string[] | undefined {
  return typeof v === "string" ? JSON.parse(v) as string[] : v;
}

export function webhookBody(input: WebhookInput): Record<string, unknown> {
  const filter = compact({
    event_type: input.eventTypes,
    sender: list(input.senders),
    status: list(input.statuses),
    message_ref: list(input.messageRefs),
    campaign_id: list(input.campaignIds),
  });
  return compact({
    name: input.name,
    url: input.url,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
    rate_limit: input.rateLimit,
  });
}

export const WEBHOOK_OUTPUT = [
  { key: "id", type: "string", label: "Webhook ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "url", type: "string", label: "URL" },
  { key: "filter", type: "object", label: "Filter" },
  { key: "rate_limit", type: "number", label: "Rate limit (requests/second)" },
] as const;

/** `POST /v2/webhook` — answers 201 with the webhook. */
const webhookCreate: ActionDefinition<WebhookInput> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Create a webhook that POSTs delivery receipts, inbound messages, link hits or " +
    "opt-outs to your URL.",
  idempotent: false,
  params: WEBHOOK_PARAMS,
  output: [...WEBHOOK_OUTPUT],

  async execute(input, ctx) {
    return await new KudosityClient(ctx).json("/webhook", {
      method: "POST",
      body: webhookBody(input),
    });
  },
};

export default webhookCreate;
