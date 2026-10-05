import type { ActionDefinition } from "@w6w/types";
import { compact, FellowClient, toList } from "../lib/client.ts";
import { ON_BEHALF_OF } from "../lib/params.ts";
import { EVENT_OPTIONS } from "../lib/events.ts";

interface Input {
  url: string;
  enabledEvents: string[] | string;
  description?: string;
  status?: string;
  scope?: string;
  onBehalfOf?: string;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Register a webhook. Fellow immediately POSTs a `url_verification` challenge to the URL, and the webhook is only created if the endpoint echoes the challenge back as plain text. The signing secret is returned once, here.",
  idempotent: false,
  params: [
    {
      key: "url",
      label: "Endpoint URL",
      type: "string",
      required: true,
      hint:
        "A public HTTPS endpoint. During creation it must answer Fellow's url_verification POST with a 2xx (not 204/205) whose body is the raw challenge string.",
    },
    {
      key: "enabledEvents",
      label: "Events",
      type: "multiselect",
      required: true,
      options: EVENT_OPTIONS,
      hint: "Event types to deliver.",
    },
    { key: "description", label: "Description", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }],
      default: "active",
    },
    {
      key: "scope",
      label: "Scope",
      type: "select",
      options: [{ value: "user", label: "User (the key's owner)" }, {
        value: "workspace",
        label: "Workspace (everyone; Super Admin key)",
      }],
      default: "user",
      hint:
        "Fixed at creation. A workspace webhook receives every matching event in the workspace, transcripts included, and needs a Super Admin key; it cannot be created through Act on behalf of.",
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
    { key: "secret", type: "string", label: "Signing secret (returned on creation only)" },
  ],

  execute(input, ctx) {
    const events = toList(input.enabledEvents);
    if (!events) throw new Error("enabledEvents must name at least one event");
    return new FellowClient(ctx).unwrap("webhook", "/webhook", {
      method: "POST",
      body: compact({
        url: input.url,
        enabled_events: events,
        description: input.description,
        status: input.status,
        scope: input.scope,
      }),
      onBehalfOf: input.onBehalfOf,
    });
  },
};

export default webhookCreate;
