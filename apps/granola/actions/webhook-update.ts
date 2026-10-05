import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, GranolaClient, type GranolaWebhookEndpoint } from "../lib/client.ts";
import { toList, webhookEventOptions, webhookIdParam, webhookScopeOptions } from "../lib/params.ts";

/**
 * `PATCH /v1/webhook-endpoints/{id}` — change an endpoint. Every field is
 * optional and an omitted one is left unchanged; `scopes`, `events` and
 * `folder_ids` REPLACE the current value. Setting "Clear folder filter" sends
 * `folder_ids: []`, the vendor's way of removing the restriction. Pausing
 * (`enabled: false`) keeps the signing secret, but events that occur while
 * paused are never delivered later.
 */
interface Input {
  webhookEndpointId: string;
  url?: string;
  scopes?: string[] | string;
  events?: string[] | string;
  folderIds?: string[] | string;
  clearFolderFilter?: boolean;
  enabled?: boolean;
}

const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook Endpoint",
  description: "Change a webhook endpoint's URL, scopes, events, folder filter or paused state.",
  idempotent: true,
  params: [
    webhookIdParam,
    { key: "url", label: "URL", type: "string", hint: "Leave empty to keep the current URL." },
    {
      key: "scopes",
      label: "Scopes",
      type: "multiselect",
      options: webhookScopeOptions,
      hint: "Replaces the current scopes.",
    },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      options: webhookEventOptions,
      hint: "Replaces the current subscriptions.",
    },
    {
      key: "folderIds",
      label: "Folder IDs",
      type: "text",
      hint: "Replaces the folder filter. Comma or newline separated, max 100.",
    },
    {
      key: "clearFolderFilter",
      label: "Clear folder filter",
      type: "boolean",
      hint: "Remove the folder restriction (overrides Folder IDs).",
    },
    {
      key: "enabled",
      label: "Enabled",
      type: "boolean",
      hint: "Off pauses deliveries; events during a pause are not replayed.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook endpoint ID" },
    { key: "url", type: "string", label: "URL" },
    { key: "events", type: "array", label: "Subscribed events" },
    { key: "folder_ids", type: "array", label: "Folder filter" },
    { key: "enabled", type: "boolean", label: "Deliveries active" },
  ],

  execute(input, ctx) {
    const scopes = toList(input.scopes);
    const events = toList(input.events);
    const listed = toList(input.folderIds);
    const folderIds = input.clearFolderFilter ? [] : listed?.length ? listed : undefined;
    return new GranolaClient(ctx).request<GranolaWebhookEndpoint>(
      `/webhook-endpoints/${encodeId(input.webhookEndpointId)}`,
      {
        method: "PATCH",
        body: compact({
          url: input.url || undefined,
          scopes: scopes?.length ? scopes : undefined,
          events: events?.length ? events : undefined,
          folder_ids: folderIds,
          enabled: input.enabled,
        }),
      },
    );
  },
};

export default webhookUpdate;
