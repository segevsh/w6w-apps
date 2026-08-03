import type { ActionDefinition } from "@w6w/types";
import { compact, FathomClient } from "../lib/client.ts";
import { triggeredForOptions } from "../lib/params.ts";

interface Input {
  destinationUrl: string;
  triggeredFor: string[];
  includeTranscript?: boolean;
  includeSummary?: boolean;
  includeActionItems?: boolean;
  includeCrmMatches?: boolean;
}

/**
 * `POST /webhooks` — subscribe a URL to Fathom's "new meeting content ready"
 * event. Answers **201** with the created webhook, including its `secret`.
 *
 * Fathom requires at least one of `include_transcript`, `include_crm_matches`,
 * `include_summary` or `include_action_items` to be true, so
 * `includeSummary` defaults to true — a webhook carrying only calendar metadata
 * would be rejected by the API.
 *
 * The returned `secret` (`whsec_…`) is what the receiver HMACs the
 * `webhook-id.webhook-timestamp.body` string with to verify a delivery. It is
 * issued by Fathom per webhook and returned only here, so it is part of this
 * action's output — store it wherever the receiving endpoint can read it.
 *
 * This is an Action rather than a Trigger on purpose: it registers a delivery
 * target the caller already owns. Fathom's inbound payload is a separate
 * concern and is not modelled here.
 */
const webhookCreate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Register a URL to receive Fathom's new-meeting-content webhook, and get back its signing secret.",
  // Replaying this registers a second webhook against the same URL; Fathom
  // publishes no idempotency key and no upsert form.
  idempotent: false,
  params: [
    {
      key: "destinationUrl",
      label: "Destination URL",
      type: "string",
      required: true,
      hint: "Where Fathom POSTs the meeting payload.",
      placeholder: "https://example.com/webhook",
    },
    {
      key: "triggeredFor",
      label: "Triggered for",
      type: "multiselect",
      required: true,
      options: triggeredForOptions,
      hint:
        "Which recordings fire the webhook. At least one is required. The two team options apply to Team Plans only.",
    },
    {
      key: "includeSummary",
      label: "Include summary",
      type: "boolean",
      default: true,
      hint: "Fathom requires at least one of the four include options to be true.",
    },
    { key: "includeTranscript", label: "Include transcript", type: "boolean", default: false },
    { key: "includeActionItems", label: "Include action items", type: "boolean", default: false },
    {
      key: "includeCrmMatches",
      label: "Include CRM matches",
      type: "boolean",
      default: false,
      hint: "Only returns data from your or your team's linked CRM.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID (pass to Delete Webhook)" },
    { key: "url", type: "string", label: "Destination URL" },
    { key: "secret", type: "string", label: "Signing secret (whsec_…) used to verify deliveries" },
    { key: "created_at", type: "string", label: "Created at (ISO 8601)" },
    { key: "triggered_for", type: "array", label: "Recording types that fire it" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating Fathom webhook", { triggeredFor: input.triggeredFor });
    const body = await new FathomClient(ctx).request<Record<string, unknown>>("/webhooks", {
      method: "POST",
      body: compact({
        destination_url: input.destinationUrl,
        triggered_for: input.triggeredFor,
        include_summary: input.includeSummary,
        include_transcript: input.includeTranscript,
        include_action_items: input.includeActionItems,
        include_crm_matches: input.includeCrmMatches,
      }),
    });
    return body ?? {};
  },
};

export default webhookCreate;
