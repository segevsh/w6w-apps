import { deleteAction } from "../lib/factory.ts";

export default deleteAction({
  key: "webhook-delete",
  title: "Delete Webhook",
  noun: "Webhook",
  type: "webhook",
  path: "webhooks",
  description: "Delete a webhook by ID.",
});
