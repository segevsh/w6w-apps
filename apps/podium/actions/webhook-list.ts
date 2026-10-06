import type { ActionDefinition } from "@w6w/types";
import { PodiumClient } from "../lib/client.ts";

type Input = Record<string, never>;

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description:
    "List the webhooks created by the user who authorized the application. The signing `secret` is write-only here: Podium echoes it back in every webhook object and this action removes it from the result. Requires no scope.",
  output: [{
    key: "items",
    type: "array",
    label: "Items",
  }, {
    key: "nextCursor",
    type: "string",
    label: "Cursor for the next page (null on the last page)",
  }],

  execute(_input, ctx) {
    return new PodiumClient(ctx).list("/webhooks", {
      redact: ["secret"],
    });
  },
};

export default webhookList;
