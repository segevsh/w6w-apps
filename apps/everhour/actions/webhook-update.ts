import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient, toList } from "../lib/client.ts";

/**
 * `PUT /hooks/{hookId}` — Change a webhook's target, events or project.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  hookId: number;
  targetUrl: string;
  events: string[] | string;
  project?: string;
}

const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description: "Change a webhook's target, events or project.",
  idempotent: true,
  params: [
    {
      key: "hookId",
      label: "Webhook ID",
      type: "number",
      required: true,
      hint: "Numeric webhook id.",
    },
    {
      key: "targetUrl",
      label: "Target URL",
      type: "string",
      required: true,
      hint:
        "HTTPS endpoint that receives events. Everhour verifies it by POSTing an empty body with an `X-Hook-Secret` header, which the endpoint must echo back.",
    },
    {
      key: "events",
      label: "Events",
      type: "string",
      required: true,
      hint:
        "Comma-separated events: api:project:created, api:project:updated, api:project:removed, api:task:created, api:task:updated, api:task:removed, api:timer:started, api:timer:stopped, api:time:updated, api:section:created, api:section:updated, api:section:removed, api:client:created, api:client:updated, api:estimate:updated.",
    },
    {
      key: "project",
      label: "Project ID",
      type: "string",
      hint: "Only receive events for this project.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Webhook ID" },
    { key: "targetUrl", type: "string", label: "Target URL" },
    { key: "events", type: "array", label: "Events" },
    { key: "isActive", type: "boolean", label: "Active" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/hooks/${encodeId(input.hookId)}`, {
      method: "PUT",
      body: compact({
        targetUrl: input.targetUrl,
        events: toList(input.events),
        project: input.project,
      }),
    });
  },
};

export default webhookUpdate;
