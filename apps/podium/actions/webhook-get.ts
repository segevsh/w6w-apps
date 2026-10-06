import type { ActionDefinition } from "@w6w/types";
import { encodeId, PodiumClient } from "../lib/client.ts";

interface Input {
  uid: string;
}

const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description:
    "Get one webhook by uid. The signing `secret` is write-only here: Podium echoes it back in every webhook object and this action removes it from the result. Requires no scope.",
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
      redact: ["secret"],
    });
  },
};

export default webhookGet;
