import type { ActionDefinition } from "@w6w/types";
import { FormsiteClient } from "../lib/client.ts";
import { formDir } from "../lib/params.ts";

interface Input {
  formDir: string;
  url: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Remove the webhook with the given post URL from a form.",
  idempotent: true,
  params: [
    formDir,
    { key: "url", label: "Webhook URL", type: "string", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new FormsiteClient(ctx).request(
      `/forms/${encodeURIComponent(input.formDir)}/webhooks`,
      { method: "DELETE", query: { url: input.url } },
    );
    return { deleted: true };
  },
};

export default webhookDelete;
