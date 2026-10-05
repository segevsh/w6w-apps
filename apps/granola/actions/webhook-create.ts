import type { ActionDefinition } from "@w6w/types";
import { compact, GranolaClient, type GranolaWebhookEndpoint } from "../lib/client.ts";
import { toList, webhookEventOptions, webhookScopeOptions } from "../lib/params.ts";

/**
 * `POST /v1/webhook-endpoints` — register an HTTPS URL for note events.
 *
 * The response carries `signing_secret` (Standard Webhooks HMAC-SHA256), shown
 * **once** — it is returned here so a workflow can store it, and Granola will
 * never show it again. Not idempotent: each call registers another endpoint.
 * 404 means the webhooks API is not enabled for this workspace.
 */
interface Input {
  url: string;
  scopes: string[] | string;
  events?: string[] | string;
  folderIds?: string[] | string;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook Endpoint",
  description: "Subscribe an HTTPS URL to note events. Returns the one-time signing secret.",
  idempotent: false,
  params: [
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      hint: "Publicly reachable HTTPS URL.",
    },
    {
      key: "scopes",
      label: "Scopes",
      type: "multiselect",
      required: true,
      options: webhookScopeOptions,
      hint: "A Workspace API key must pass exactly `workspace`.",
    },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      options: webhookEventOptions,
      hint: "Leave empty to subscribe to all three.",
    },
    {
      key: "folderIds",
      label: "Folder IDs",
      type: "text",
      hint: "Restrict to these folders and their subfolders (max 100), comma or newline separated.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook endpoint ID" },
    { key: "url", type: "string", label: "URL" },
    { key: "signing_secret", type: "string", label: "Signing secret (shown only once)" },
    { key: "events", type: "array", label: "Subscribed events" },
    { key: "scopes", type: "array", label: "Scopes" },
    { key: "enabled", type: "boolean", label: "Deliveries active" },
  ],

  execute(input, ctx) {
    const folderIds = toList(input.folderIds);
    return new GranolaClient(ctx).request<GranolaWebhookEndpoint & { signing_secret: string }>(
      "/webhook-endpoints",
      {
        method: "POST",
        body: compact({
          url: input.url,
          scopes: toList(input.scopes),
          events: toList(input.events)?.length ? toList(input.events) : undefined,
          folder_ids: folderIds?.length ? folderIds : undefined,
        }),
      },
    );
  },
};

export default webhookCreate;
