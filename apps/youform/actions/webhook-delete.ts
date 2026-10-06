import type { ActionDefinition } from "@w6w/types";
import { encodeId, YouformClient } from "../lib/client.ts";

interface Input {
  webhook: number | string;
}

/** `DELETE /api/webhooks/{id}` — answers `{"success": true}`. */
const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete webhook",
  description: "Delete a webhook so Youform stops delivering submissions to it.",
  idempotent: true,
  params: [
    {
      key: "webhook",
      label: "Webhook ID",
      type: "number",
      required: true,
      hint: "The id returned by Create webhook.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Whether the webhook was deleted" }],

  execute(input, ctx) {
    return new YouformClient(ctx).json(`/webhooks/${encodeId(input.webhook)}`, {
      method: "DELETE",
    });
  },
};

export default webhookDelete;
