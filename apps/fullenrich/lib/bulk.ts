import type { Param } from "@w6w/types";

export const WEBHOOK_PARAMS: Param[] = [
  {
    key: "webhookUrl",
    label: "Webhook URL (batch finished)",
    type: "string",
    hint:
      "FullEnrich POSTs the full result here when the whole batch is finished, out of credits, or canceled. Must start with http or https. Signed with `X-Signature-SHA1` (HMAC-SHA1 of the raw body, keyed by your API key). Optional: poll the matching Get action instead.",
  },
  {
    key: "contactFinishedWebhookUrl",
    label: "Webhook URL (each contact finished)",
    type: "string",
    hint: "POSTed each time a single contact is done, without waiting for the batch.",
  },
];

export const SILENT_FAIL_PARAM: Param = {
  key: "silentFail",
  label: "Skip invalid contacts",
  type: "boolean",
  hint:
    "When on, a contact with invalid or missing input is skipped (returned without data) instead of failing the whole request.",
};

export function webhookBody(
  input: { webhookUrl?: string; contactFinishedWebhookUrl?: string },
): Record<string, unknown> {
  return {
    webhook_url: input.webhookUrl || undefined,
    webhook_events: input.contactFinishedWebhookUrl
      ? { contact_finished: input.contactFinishedWebhookUrl }
      : undefined,
  };
}

/** Job statuses documented for both result endpoints. */
export const STATUSES = [
  "CREATED",
  "IN_PROGRESS",
  "CANCELED",
  "CREDITS_INSUFFICIENT",
  "FINISHED",
  "RATE_LIMIT",
  "UNKNOWN",
];

export interface BulkResult {
  id?: string;
  name?: string;
  status?: string;
  data?: unknown[];
  cost?: { credits?: number };
}

export function shapeResult(res: BulkResult) {
  return {
    id: res.id ?? null,
    name: res.name ?? null,
    status: res.status ?? null,
    credits: res.cost?.credits ?? null,
    data: res.data ?? [],
  };
}

export const RESULT_OUTPUT = [
  { key: "id", type: "string" as const, label: "Enrichment ID" },
  { key: "name", type: "string" as const, label: "Name" },
  {
    key: "status",
    type: "string" as const,
    label: "Status (CREATED, IN_PROGRESS, FINISHED, CANCELED, CREDITS_INSUFFICIENT, RATE_LIMIT)",
  },
  { key: "credits", type: "number" as const, label: "Credits consumed" },
  { key: "data", type: "array" as const, label: "Per-contact records" },
];
