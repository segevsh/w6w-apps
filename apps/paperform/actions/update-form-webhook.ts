import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import { webhookIdParam } from "../lib/params.ts";

interface Input {
  id: string;
  targetUrl?: string;
  triggers?: string[] | string;
}

/**
 * `PUT /webhooks/{id}` — update a webhook's target URL and/or triggers.
 *
 * Business plan only, per Paperform's own docs. `idempotent: true` — a PUT with the same
 * values leaves the webhook in the same state no matter how many times it runs.
 */
const updateFormWebhook: ActionDefinition<Input> = {
  key: "update-form-webhook",
  type: "perform",
  resource: "webhook",
  title: "Update Form Webhook",
  description: "Update a webhook's target URL and/or triggers. Requires the Business plan.",
  idempotent: true,
  params: [
    webhookIdParam,
    { key: "targetUrl", label: "Target URL", type: "string" },
    {
      key: "triggers",
      label: "Triggers",
      type: "multiselect",
      options: [
        { value: "submission", label: "Submission" },
        { value: "partial_submission", label: "Partial submission" },
      ],
    },
  ],
  output: [{ key: "webhook", type: "object", label: "Updated webhook" }],

  async execute(input, ctx) {
    const triggers = input.triggers === undefined
      ? undefined
      : Array.isArray(input.triggers)
      ? input.triggers
      : input.triggers.split(",").map((t) => t.trim()).filter(Boolean);
    const results = await new PaperformClient(ctx).results<{ webhook?: unknown }>(
      `/webhooks/${encodeURIComponent(input.id)}`,
      { method: "PUT", body: { target_url: input.targetUrl, triggers } },
    );
    return { webhook: results?.webhook };
  },
};

export default updateFormWebhook;
