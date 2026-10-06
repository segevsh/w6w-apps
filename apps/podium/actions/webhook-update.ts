import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, PodiumClient, toList } from "../lib/client.ts";

interface Input {
  uid: string;
  url?: string;
  eventTypes?: string[] | string;
  secret?: string;
  disabled?: boolean;
}

const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description:
    "Change a webhook's URL, events, secret or disabled flag; unset fields are left alone. The signing `secret` is write-only here: Podium echoes it back in every webhook object and this action removes it from the result. Requires scope `(depends on the event types)`.",
  idempotent: true,
  params: [{
    key: "uid",
    label: "Webhook UID",
    type: "string",
    required: true,
  }, {
    key: "url",
    label: "URL",
    type: "string",
  }, {
    key: "eventTypes",
    label: "Event types",
    type: "string",
    hint: "Comma-separated; replaces the current list.",
  }, {
    key: "secret",
    label: "Signing secret",
    type: "secret",
  }, {
    key: "disabled",
    label: "Disabled",
    type: "boolean",
  }],
  output: [{
    key: "createdAt",
    type: "string",
    label: "When the webhook was created",
  }, {
    key: "disabled",
    type: "boolean",
    label: "Whether the webhook is disabled or not",
  }, {
    key: "eventTypes",
    type: "array",
    label: "eventTypes",
  }, {
    key: "locationUid",
    type: "string",
    label: "Podium unique identifier for location",
  }, {
    key: "organizationUid",
    type: "string",
    label: "Podium unique identifier for location",
  }, {
    key: "uid",
    type: "string",
    label: "Podium unique identifier for webhook",
  }, {
    key: "updatedAt",
    type: "string",
    label: "When the webhook was last updated",
  }, {
    key: "url",
    type: "string",
    label: "URL that webhook events will be sent to",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one(`/webhooks/${encodeId(input.uid)}`, {
      method: "PUT",
      body: compact({
        url: input.url,
        eventTypes: toList(input.eventTypes),
        secret: input.secret,
        disabled: input.disabled,
      }),
      redact: ["secret"],
    });
  },
};

export default webhookUpdate;
