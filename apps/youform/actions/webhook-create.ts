import type { ActionDefinition } from "@w6w/types";
import { YouformClient } from "../lib/client.ts";

interface Input {
  form: string;
  webhook_url: string;
}

/**
 * `POST /api/webhooks?form_id=<slug>&webhook_url=<url>`.
 *
 * Trap: the collection sends BOTH values as **query parameters** with no
 * request body, and `form_id` is the form's *slug*, not its numeric id. The
 * URL must be `https://` (help centre) and Youform POSTs a test payload to it
 * while saving; a non-2xx reply still saves the webhook but leaves it disabled.
 * Answers `{"success": true, "data": {"id": <webhook id>}}`. Not idempotent: a
 * retry registers a second webhook that delivers every submission twice.
 */
const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create webhook",
  description: "Register a webhook that Youform POSTs each new submission of a form to.",
  idempotent: false,
  params: [
    {
      key: "form",
      label: "Form slug",
      type: "string",
      required: true,
      hint: "The slug in the form's share link, not the numeric id.",
    },
    {
      key: "webhook_url",
      label: "Webhook URL",
      type: "string",
      required: true,
      validation: { pattern: "^https://" },
      hint: "Must be https://. Youform sends a test payload while saving; a non-2xx reply " +
        "leaves the webhook disabled.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the webhook was created" },
    { key: "data", type: "object", label: "{ id } of the new webhook" },
  ],

  execute(input, ctx) {
    return new YouformClient(ctx).json("/webhooks", {
      method: "POST",
      query: { form_id: input.form, webhook_url: input.webhook_url },
    });
  },
};

export default webhookCreate;
