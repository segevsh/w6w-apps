import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { EVENT_TYPES, eventTypeOptions } from "../lib/params.ts";

interface Input {
  webhookId: string;
  formId: string;
  url: string;
  isEnabled: boolean;
  eventTypes?: string[];
  signingSecret?: string;
  httpHeaders?: unknown;
}

/**
 * PATCH /webhooks/{webhookId} — update a subscription. Responds 204, no body.
 *
 * Despite being a PATCH, the API marks `formId`, `url`, `eventTypes` and
 * `isEnabled` as **required** in the request body — so this action requires
 * them too rather than letting a caller discover the 400. Fetch the current
 * values with Get Many Webhooks and send them back with the change applied.
 *
 * Toggling `isEnabled` is what pauses a webhook; there is no separate
 * enable/disable endpoint.
 */
const webhookUpdate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description:
    "Update a webhook subscription, or pause it with `isEnabled: false`. The API requires the full form ID, URL, event types and enabled flag on every call.",
  idempotent: true,
  params: [
    {
      key: "webhookId",
      label: "Webhook ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Webhooks.",
    },
    { key: "formId", label: "Form ID", type: "string", required: true },
    { key: "url", label: "Endpoint URL", type: "string", required: true },
    {
      key: "isEnabled",
      label: "Enabled",
      type: "boolean",
      required: true,
      default: true,
      hint: "Set false to pause deliveries without deleting the subscription.",
    },
    {
      key: "eventTypes",
      label: "Event types",
      type: "multiselect",
      default: [...EVENT_TYPES],
      options: eventTypeOptions,
    },
    { key: "signingSecret", label: "Signing secret", type: "secret" },
    {
      key: "httpHeaders",
      label: "Custom HTTP headers",
      type: "json",
      hint: 'Optional array of `{ "name": "...", "value": "..." }` headers.',
    },
  ],
  output: [
    { key: "webhookId", type: "string", label: "Webhook ID" },
    { key: "updated", type: "boolean", label: "Updated" },
  ],

  async execute(input, ctx) {
    await new TallyClient(ctx).request(
      `/webhooks/${encodeURIComponent(input.webhookId)}`,
      {
        method: "PATCH",
        body: {
          formId: input.formId,
          url: input.url,
          isEnabled: input.isEnabled,
          eventTypes: input.eventTypes ?? [...EVENT_TYPES],
          signingSecret: input.signingSecret,
          httpHeaders: input.httpHeaders,
        },
      },
    );
    return { webhookId: input.webhookId, updated: true };
  },
};

export default webhookUpdate;
