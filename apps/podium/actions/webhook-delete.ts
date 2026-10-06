import type { ActionDefinition } from "@w6w/types";
import { encodeId, PodiumClient } from "../lib/client.ts";

interface Input {
  uid: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description:
    "Delete a webhook. The signing `secret` is write-only here: Podium echoes it back in every webhook object and this action removes it from the result. Requires no scope.",
  idempotent: true,
  params: [{
    key: "uid",
    label: "Webhook UID",
    type: "string",
    required: true,
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
      method: "DELETE",
      redact: ["secret"],
    });
  },
};

export default webhookDelete;
