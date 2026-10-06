import type { ActionDefinition } from "@w6w/types";
import { DropcontactClient, WEBHOOK_PATH } from "../lib/client.ts";

/** `DELETE /v1/enrich/webhook`. After it, only requests with their own callback URL get a webhook. */
const deleteDefaultWebhook: ActionDefinition = {
  key: "delete-default-webhook",
  type: "perform",
  resource: "webhook",
  title: "Delete Default Webhook",
  description: "Remove the account's default webhook URL. Requests that carry their own webhook " +
    "URL are unaffected.",
  idempotent: true,
  params: [],
  output: [
    { key: "deleted", type: "boolean", label: "True when the vendor accepted the delete" },
    { key: "response", type: "object", label: "Vendor response" },
  ],

  async execute(_input, ctx) {
    const { body } = await new DropcontactClient(ctx).request("DELETE", WEBHOOK_PATH);
    return { deleted: true, response: body };
  },
};

export default deleteDefaultWebhook;
