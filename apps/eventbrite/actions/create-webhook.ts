import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { WEBHOOK_ACTIONS } from "../lib/triggers.ts";

interface Input {
  organizationId: string;
  endpointUrl: string;
  actions?: string[];
  eventId?: string;
  extra?: Record<string, unknown>;
}

const createWebhook: ActionDefinition<Input> = {
  key: "create-webhook",
  type: "perform",
  idempotent: false,
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Create a webhook on an organization. Eventbrite will POST to the endpoint URL whenever one of the chosen actions occurs (optionally limited to one event). Creates a new webhook on Eventbrite.",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
    { key: "endpointUrl", label: "Endpoint URL", type: "string", required: true },
    {
      key: "actions",
      label: "Actions",
      type: "multiselect",
      options: WEBHOOK_ACTIONS.map((a) => ({ value: a, label: a })),
      hint: "Actions that trigger the webhook. Leave empty to use Eventbrite's default.",
    },
    {
      key: "eventId",
      label: "Event ID",
      type: "string",
      hint: "Limit the webhook to one event. Leave blank for all events.",
    },
    { key: "extra", label: "Additional fields", type: "json" },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "resource_uri", type: "string", label: "Resource URI" },
    { key: "created", type: "string", label: "Created" },
    { key: "actions", type: "array", label: "Actions" },
    { key: "user_id", type: "string", label: "Organization ID" },
    { key: "event_id", type: "string", label: "Event ID" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const body: Record<string, unknown> = { endpoint_url: input.endpointUrl };
    if (input.actions && input.actions.length > 0) body.actions = input.actions.join(",");
    if (input.eventId) body.event_id = input.eventId;
    Object.assign(body, input.extra ?? {});
    return client.request(
      `/organizations/${encodeURIComponent(input.organizationId)}/webhooks/`,
      { method: "POST", body },
    );
  },
};

export default createWebhook;
