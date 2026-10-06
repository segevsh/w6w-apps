import type { ActionDefinition } from "@w6w/types";
import { compact, FullEnrichClient, jsonValue } from "../lib/client.ts";
import { SILENT_FAIL_PARAM, WEBHOOK_PARAMS, webhookBody } from "../lib/bulk.ts";

interface Input {
  name: string;
  email?: string;
  custom?: Record<string, string> | string;
  emails?: unknown;
  webhookUrl?: string;
  contactFinishedWebhookUrl?: string;
  silentFail?: boolean;
}

/** `POST /contact/reverse/email/bulk` — asynchronous; answers `{ enrichment_id }`. */
const reverseEmailStart: ActionDefinition<Input> = {
  key: "reverse-email-start",
  type: "perform",
  resource: "reverse-email",
  title: "Start Reverse Email Lookup",
  description:
    "Find the person and company behind an email address (or a batch of them). Asynchronous: returns an ID immediately; read it with Get Reverse Email Result or receive it on a webhook. 1 credit per person found.",
  idempotent: false,
  params: [
    { key: "name", label: "Lookup name", type: "string", required: true },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Single-email mode. Ignored when Emails is set.",
    },
    {
      key: "custom",
      label: "Custom data (JSON)",
      type: "json",
      hint:
        "String-valued object returned untouched in the result (max 10 keys, 100 characters per value).",
    },
    {
      key: "emails",
      label: "Emails (JSON array)",
      type: "json",
      hint: "Bulk mode: an array of {email, custom?} objects.",
    },
    ...WEBHOOK_PARAMS,
    SILENT_FAIL_PARAM,
  ],
  output: [{ key: "enrichmentId", type: "string", label: "Reverse lookup ID" }],

  async execute(input, ctx) {
    const bulk = jsonValue(input.emails);
    const data = Array.isArray(bulk) && bulk.length > 0
      ? bulk
      : [compact({ email: input.email, custom: jsonValue(input.custom) })];

    const res = await new FullEnrichClient(ctx).request<{ enrichment_id?: string }>(
      "POST",
      "/contact/reverse/email/bulk",
      {
        query: { silentFail: input.silentFail ? true : undefined },
        body: compact({ name: input.name, ...webhookBody(input), data }),
      },
    );
    return { enrichmentId: res.enrichment_id ?? null };
  },
};

export default reverseEmailStart;
