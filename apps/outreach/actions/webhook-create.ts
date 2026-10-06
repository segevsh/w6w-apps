import { stripWebhookSecrets } from "../lib/client.ts";
import { createAction } from "../lib/factory.ts";

export default createAction({
  key: "webhook-create",
  title: "Create Webhook",
  noun: "Webhook",
  type: "webhook",
  path: "webhooks",
  transform: stripWebhookSecrets,
  description:
    "Subscribe a URL to Outreach events. Resource and action default to `*` (everything). If you set a secret, Outreach signs each delivery with an HMAC in `Outreach-Webhook-Signature`. The secret and the cleanup token are not returned by this action.",
  attrParams: [
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      hint: "HTTPS endpoint that will receive the POSTs.",
    },
    {
      key: "resource",
      label: "Resource",
      type: "select",
      default: "*",
      options: [
        "*",
        "account",
        "call",
        "emailAddress",
        "import",
        "kaiaRecording",
        "mailing",
        "opportunity",
        "opportunityProspectRole",
        "prospect",
        "sequence",
        "sequenceState",
        "task",
        "user",
      ].map((v) => ({ value: v, label: v === "*" ? "All resources" : v })),
    },
    {
      key: "action",
      label: "Action",
      type: "select",
      default: "*",
      hint:
        "Not every action exists for every resource (e.g. `completed` is task-only). Outreach rejects invalid pairs with a 422.",
      options: [
        "*",
        "created",
        "updated",
        "destroyed",
        "finished",
        "advanced",
        "completed",
        "bounced",
        "delivered",
        "opened",
        "replied",
      ].map((v) => ({ value: v, label: v === "*" ? "All actions" : v })),
    },
    { key: "secret", label: "Signing secret", type: "secret" },
    {
      key: "payloadVersion",
      label: "Payload version",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1, max: 2 },
      hint:
        "1 or 2. Version 2 adds a `beforeUpdate` block with the previous values of changed attributes.",
    },
  ],
});
