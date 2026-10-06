import type { ActionDefinition } from "@w6w/types";
import { SevenClient } from "../lib/client.ts";

/** `DELETE /api/hooks` — by `id`; answers `{success, code, id, error_message}`. */
interface Input {
  id: number;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook by id.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Webhook ID",
      type: "number",
      required: true,
      hint: "From List Webhooks or Register Webhook.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the webhook was deleted" },
    { key: "id", type: "number", label: "Webhook id" },
  ],

  execute(input, ctx) {
    return new SevenClient(ctx).request("DELETE", "/hooks", { form: { id: input.id } });
  },
};

export default webhookDelete;
