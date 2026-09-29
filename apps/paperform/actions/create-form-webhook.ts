import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import { slugOrIdParam } from "../lib/params.ts";

interface Input {
  slugOrId: string;
  targetUrl: string;
  triggers: string[] | string;
}

/**
 * `POST /forms/{slug_or_id}/webhooks` — create a webhook on a form.
 *
 * Business plan only, per Paperform's own docs. `idempotent: false` — Paperform documents no
 * idempotency key for webhook creation, so a retry creates a second webhook.
 */
const createFormWebhook: ActionDefinition<Input> = {
  key: "create-form-webhook",
  type: "perform",
  resource: "webhook",
  title: "Create Form Webhook",
  description: "Create a webhook on a form, firing on submission and/or partial-submission " +
    "events. Requires the Business plan.",
  idempotent: false,
  params: [
    slugOrIdParam,
    {
      key: "targetUrl",
      label: "Target URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/webhook",
    },
    {
      key: "triggers",
      label: "Triggers",
      type: "multiselect",
      required: true,
      options: [
        { value: "submission", label: "Submission" },
        { value: "partial_submission", label: "Partial submission" },
      ],
    },
  ],
  output: [{ key: "webhook", type: "object", label: "Created webhook" }],

  async execute(input, ctx) {
    const triggers = Array.isArray(input.triggers)
      ? input.triggers
      : input.triggers.split(",").map((t) => t.trim()).filter(Boolean);
    const results = await new PaperformClient(ctx).results<{ webhook?: unknown }>(
      `/forms/${encodeURIComponent(input.slugOrId)}/webhooks`,
      { method: "POST", body: { target_url: input.targetUrl, triggers } },
    );
    return { webhook: results?.webhook };
  },
};

export default createFormWebhook;
