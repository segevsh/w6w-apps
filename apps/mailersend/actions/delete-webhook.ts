import { deleteById, seg } from "../lib/factories.ts";

export default deleteById({
  key: "delete-webhook",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook (DELETE /v1/webhooks/{id}).",
  path: (id) => `/webhooks/${seg(id)}`,
  idKey: "webhookId",
  idLabel: "Webhook ID",
});
