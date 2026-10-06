import type { ActionDefinition } from "@w6w/types";
import { compact, MailerSendClient, redactSecrets, toList } from "../lib/client.ts";
import { WEBHOOK_EVENTS } from "./update-webhook.ts";

interface Input {
  domainId: string;
  name: string;
  url: string;
  events: unknown;
  enabled?: boolean;
  version?: number;
}

const createWebhook: ActionDefinition<Input> = {
  key: "create-webhook",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Create a webhook on a domain (POST /v1/webhooks). MailerSend sends a `webhook.test` ping to the URL first and only saves the webhook if it answers 2xx. The signing secret MailerSend generates is stripped from the result: this app never returns it.",
  idempotent: false,
  params: [
    { key: "domainId", label: "Domain ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true, hint: "Max 50 characters." },
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      hint: "Max 191 characters. Must answer the test ping with a 2xx.",
    },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      required: true,
      options: WEBHOOK_EVENTS.map((v) => ({ value: v, label: v })),
    },
    { key: "enabled", label: "Enabled", type: "boolean", hint: "Unset keeps the vendor default." },
    {
      key: "version",
      label: "Payload version",
      type: "select",
      options: [{ value: 2, label: "2 (recommended)" }, { value: 1, label: "1 (legacy)" }],
    },
  ],
  output: [{ key: "data", type: "object", label: "The created webhook" }],

  async execute(input, ctx) {
    const events = toList(input.events);
    if (!events) throw new Error("events must name at least one event");
    return redactSecrets(
      await new MailerSendClient(ctx).json("/webhooks", {
        method: "POST",
        body: compact({
          domain_id: input.domainId,
          name: input.name,
          url: input.url,
          events,
          enabled: input.enabled,
          version: input.version === undefined ? undefined : Number(input.version),
        }),
      }),
    );
  },
};

export default createWebhook;
