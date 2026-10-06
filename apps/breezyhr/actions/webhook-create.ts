import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, compact, company, strList } from "../lib/client.ts";
import { companyIdParam, WEBHOOK_EVENTS } from "../lib/params.ts";

interface Input {
  companyId: string;
  url: string;
  events: string[] | string;
  description?: string;
}

/**
 * `POST /company/{id}/webhook_endpoints` — at most 10 endpoints per company (429 beyond). The
 * signing `secret` is returned only on this call and cannot be read again.
 */
const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook Endpoint",
  description:
    "Subscribe a URL to candidate and position events. The response carries the signing secret once; store it.",
  idempotent: false,
  params: [
    companyIdParam,
    { key: "url", label: "URL", type: "string", required: true, hint: "Must be HTTPS and public." },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      required: true,
      options: WEBHOOK_EVENTS.map((value) => ({ value, label: value })),
    },
    { key: "description", label: "Description", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Endpoint ID" },
    { key: "url", type: "string", label: "URL" },
    { key: "events", type: "array", label: "Subscribed events" },
    { key: "secret", type: "string", label: "Signing secret (shown only now)" },
  ],

  execute(input, ctx) {
    return new BreezyClient(ctx).request("POST", `${company(input.companyId)}/webhook_endpoints`, {
      body: compact({
        url: input.url,
        events: strList(input.events) ?? [],
        description: input.description || undefined,
      }),
    });
  },
};

export default webhookCreate;
