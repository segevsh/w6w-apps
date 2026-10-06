import type { ActionDefinition } from "@w6w/types";
import { compact, IroncladClient, toList } from "../lib/client.ts";
import { webhookEventOptions } from "../lib/params.ts";

interface Input {
  events: string[] | string;
  targetURL: string;
  status?: string;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Register an HTTPS endpoint to receive Ironclad events, such as workflow_completed or workflow_signature_packet_fully_signed. Create one webhook per set of events you want routed to a given URL.",
  idempotent: false,
  params: [
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      required: true,
      options: webhookEventOptions,
      hint: 'Avoid "*" in busy accounts: it delivers every event type.',
    },
    {
      key: "targetURL",
      label: "Target URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/hooks/ironclad",
      hint: "Must be an HTTPS URL.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "enabled",
      options: [
        { value: "enabled", label: "Enabled" },
        { value: "disabled", label: "Disabled" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "events", type: "array", label: "Events" },
    { key: "targetURL", type: "string", label: "Target URL" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const events = toList(input.events);
    if (!events) throw new Error("choose at least one event");
    if (!/^https:\/\//i.test(String(input.targetURL ?? "").trim())) {
      throw new Error("targetURL must be an HTTPS URL");
    }
    return new IroncladClient(ctx).json("/webhooks", {
      method: "POST",
      body: compact({ events, targetURL: input.targetURL.trim(), status: input.status }),
    });
  },
};

export default webhookCreate;
