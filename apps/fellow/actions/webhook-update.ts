import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, FellowClient, toList } from "../lib/client.ts";
import { ON_BEHALF_OF } from "../lib/params.ts";
import { EVENT_OPTIONS } from "../lib/events.ts";

interface Input {
  webhookId: string;
  url?: string;
  enabledEvents?: string[] | string;
  description?: string;
  status?: string;
  onBehalfOf?: string;
}

const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description:
    "Partially update a webhook: only the fields you give are changed. Changing the URL triggers a fresh url_verification challenge. Scope cannot be changed.",
  idempotent: true,
  params: [
    {
      key: "webhookId",
      label: "Webhook ID",
      type: "string",
      required: true,
      hint: "From the `id` of a Create Webhook or List Webhooks result.",
    },
    {
      key: "url",
      label: "Endpoint URL",
      type: "string",
      hint: "Changing it re-runs the url_verification challenge.",
    },
    {
      key: "enabledEvents",
      label: "Events",
      type: "multiselect",
      options: EVENT_OPTIONS,
      hint: "Replaces the subscribed event list. Leave empty to keep it.",
    },
    { key: "description", label: "Description", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }],
    },
    ON_BEHALF_OF,
  ],
  output: [
    { key: "id", type: "string", label: "Webhook id" },
    { key: "url", type: "string", label: "Receiving URL" },
    { key: "status", type: "string", label: "active or inactive" },
    { key: "scope", type: "string", label: "user or workspace" },
    { key: "enabled_events", type: "array", label: "Subscribed events" },
    { key: "description", type: "string", label: "Description" },
  ],

  execute(input, ctx) {
    const body = compact({
      url: input.url,
      enabled_events: toList(input.enabledEvents),
      description: input.description,
      status: input.status,
    });
    if (Object.keys(body).length === 0) {
      throw new Error("Nothing to update: give at least one field");
    }
    return new FellowClient(ctx).unwrap("webhook", `/webhook/${encodeId(input.webhookId)}`, {
      method: "PATCH",
      body,
      onBehalfOf: input.onBehalfOf,
    });
  },
};

export default webhookUpdate;
