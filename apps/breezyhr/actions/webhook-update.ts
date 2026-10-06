import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, compact, company, seg, strList } from "../lib/client.ts";
import { companyIdParam, WEBHOOK_EVENTS, WEBHOOK_OUTPUT } from "../lib/params.ts";

interface Input {
  companyId: string;
  endpointId: string;
  url?: string;
  events?: string[] | string;
  description?: string;
  enabled?: boolean;
}

/**
 * `PUT /company/{id}/webhook_endpoint/{id}` — only the fields sent change; `events` replaces the
 * whole list and must be non-empty. `enabled: true` clears an auto-disable but, unlike Resume,
 * does not change `status`.
 */
const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook Endpoint",
  description:
    "Change a webhook endpoint's URL, events, description or enabled flag. Only the fields you set change.",
  idempotent: true,
  params: [
    companyIdParam,
    { key: "endpointId", label: "Endpoint ID", type: "string", required: true },
    { key: "url", label: "URL", type: "string", hint: "Must be HTTPS and public." },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      hint: "Replaces the whole subscription list; must not be empty.",
      options: WEBHOOK_EVENTS.map((value) => ({ value, label: value })),
    },
    { key: "description", label: "Description", type: "string" },
    {
      key: "enabled",
      label: "Enabled",
      type: "boolean",
      hint: "Setting true clears an auto-disable and the failure count.",
    },
  ],
  output: WEBHOOK_OUTPUT,

  execute(input, ctx) {
    return new BreezyClient(ctx).request(
      "PUT",
      `${company(input.companyId)}/webhook_endpoint/${seg(input.endpointId)}`,
      {
        body: compact({
          url: input.url || undefined,
          events: input.events === undefined ? undefined : strList(input.events),
          description: input.description,
          enabled: input.enabled,
        }),
      },
    );
  },
};

export default webhookUpdate;
