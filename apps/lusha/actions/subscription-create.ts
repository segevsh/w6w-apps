import type { ActionDefinition } from "@w6w/types";
import { compact, LushaClient, strList } from "../lib/client.ts";

interface Input {
  url: string;
  entityType?: string;
  signalTypes?: string | string[];
  name?: string;
  entityIds: string | string[];
}

const action: ActionDefinition<Input> = {
  key: "subscription-create",
  type: "perform",
  resource: "subscription",
  title: "Create Webhook Subscriptions",
  description: "Subscribe a webhook URL to signal events for up to 25 contacts or companies.",
  idempotent: false,
  params: [
    {
      key: "url",
      label: "Webhook URL",
      type: "string",
      required: true,
      hint: "HTTPS endpoint that receives the events.",
    },
    {
      key: "entityType",
      label: "Entity type",
      type: "select",
      options: [{ value: "contact", label: "contact" }, { value: "company", label: "company" }],
      hint: "contact or company.",
    },
    { key: "signalTypes", label: "Signal types", type: "string" },
    { key: "name", label: "Name prefix", type: "string" },
    {
      key: "entityIds",
      label: "Entity IDs",
      type: "string",
      required: true,
      hint: "Up to 25 contact or company ids.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Per-subscription success or error, by index" },
  ],

  execute(input, ctx) {
    return new LushaClient(ctx).request("POST", `/api/subscriptions`, {
      body: compact({
        defaults: compact({
          url: input.url,
          entityType: input.entityType,
          signalTypes: strList(input.signalTypes),
        }),
        subscriptions: (strList(input.entityIds) ?? []).map((entityId) => ({ entityId })),
        name: input.name,
      }),
    });
  },
};

export default action;
