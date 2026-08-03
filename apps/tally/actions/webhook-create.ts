import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { EVENT_TYPES, eventTypeOptions } from "../lib/params.ts";

interface Input {
  formId: string;
  url: string;
  eventTypes?: string[];
  signingSecret?: string;
  httpHeaders?: unknown;
  externalSubscriber?: string;
}

/**
 * POST /webhooks — subscribe a URL to a form's events. Responds 201.
 *
 * `eventTypes` is required by the API but has exactly one documented member
 * today (`FORM_RESPONSE`), so it defaults to that rather than forcing every
 * caller to restate it.
 *
 * `signingSecret` is a **secret param**: Tally uses it to sign delivery
 * payloads so the receiver can verify them. It is a value the caller chooses
 * and sends here, not a credential Tally issues — which is why it belongs in
 * the action rather than in the auth method.
 */
const webhookCreate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Subscribe a URL to a form's submission events.",
  // Replaying this creates a second subscription to the same URL.
  idempotent: false,
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "The form whose events this webhook receives.",
    },
    {
      key: "url",
      label: "Endpoint URL",
      type: "string",
      required: true,
      hint: "Where Tally POSTs the event payload.",
    },
    {
      key: "eventTypes",
      label: "Event types",
      type: "multiselect",
      default: [...EVENT_TYPES],
      options: eventTypeOptions,
      hint: "Events to receive. `FORM_RESPONSE` is the only type Tally publishes today.",
    },
    {
      key: "signingSecret",
      label: "Signing secret",
      type: "secret",
      hint: "Optional. Tally signs delivery payloads with this so your endpoint can verify them.",
    },
    {
      key: "httpHeaders",
      label: "Custom HTTP headers",
      type: "json",
      hint:
        'Optional array of `{ "name": "...", "value": "..." }` headers to send with each delivery.',
    },
    {
      key: "externalSubscriber",
      label: "External subscriber",
      type: "string",
      hint: "Optional identifier for the system consuming this webhook.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "url", type: "string", label: "Endpoint URL" },
    { key: "isEnabled", type: "boolean", label: "Enabled" },
    { key: "webhook", type: "object", label: "The created webhook" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating Tally webhook", { formId: input.formId });
    const webhook = await new TallyClient(ctx).request<Record<string, unknown>>("/webhooks", {
      method: "POST",
      body: {
        formId: input.formId,
        url: input.url,
        eventTypes: input.eventTypes ?? [...EVENT_TYPES],
        signingSecret: input.signingSecret,
        httpHeaders: input.httpHeaders,
        externalSubscriber: input.externalSubscriber,
      },
    });
    return {
      id: webhook?.id,
      url: webhook?.url,
      isEnabled: webhook?.isEnabled,
      webhook,
    };
  },
};

export default webhookCreate;
