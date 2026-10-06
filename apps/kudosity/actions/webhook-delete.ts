import type { ActionDefinition } from "@w6w/types";
import { encodeId, KudosityClient } from "../lib/client.ts";

/** `DELETE /v2/webhook/{id}` — answers 200 `{"message": "..."}`; 404 for an unknown id. */
interface Input {
  id: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook by id.",
  idempotent: true,
  params: [{ key: "id", label: "Webhook ID", type: "string", required: true, hint: "A UUID." }],
  output: [
    { key: "id", type: "string", label: "Webhook deleted" },
    { key: "message", type: "string", label: "Vendor confirmation" },
  ],

  async execute(input, ctx) {
    const body = await new KudosityClient(ctx).json<{ message?: string } | null>(
      `/webhook/${encodeId(input.id)}`,
      { method: "DELETE" },
    );
    return { id: input.id, message: body?.message ?? "" };
  },
};

export default webhookDelete;
