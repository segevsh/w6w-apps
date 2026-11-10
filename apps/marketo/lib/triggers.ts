import type { OutputField, TriggerDefinition } from "@w6w/types";
import { requireRawBody } from "../../_shared/webhook/mod.ts";

/**
 * Marketo webhook trigger (rfcs/trigger.md, webhook form, manual setup, UNSIGNED).
 *
 * A Marketo webhook is an OUTBOUND HTTP call that a Smart Campaign makes through the "Call Webhook"
 * flow step: the admin defines the URL, the HTTP method, a payload template with lead tokens and the
 * encoding (JSON or Form/Url) under Admin, Webhooks. There is no registration API and no signature,
 * so the payload is whatever the template produces. This trigger accepts that payload (a JSON object
 * or a form-encoded body), lifts the common lead keys (`leadId`, `email`, `campaign`) and passes the
 * whole payload through as `data`.
 *
 * Trust model: Marketo does NOT sign webhook calls and offers no shared secret field. The callback
 * URL is the secret; keep it private.
 *
 * Docs (verified 2026-11-10):
 * https://experienceleague.adobe.com/en/docs/marketo/using/product-docs/administration/additional-integrations/create-a-webhook,
 * https://experienceleague.adobe.com/en/docs/marketo-developer/marketo/webhooks/webhooks and
 * https://experienceleague.adobe.com/en/docs/marketo/using/product-docs/core-marketo-concepts/smart-campaigns/flow-actions/call-webhook
 */

/** The run's `trigger.event`: one Marketo "Call Webhook" delivery. */
export interface MarketoLeadEvent {
  leadId: string | null;
  email: string | null;
  campaign: string | null;
  data: Record<string, unknown>;
}

const OUTPUT: OutputField[] = [
  { key: "leadId", type: "string", label: "Lead ID (the leadId key of your payload, if any)" },
  { key: "email", type: "string", label: "Email (the email key of your payload, if any)" },
  { key: "campaign", type: "string", label: "Campaign (the campaign key of your payload, if any)" },
  { key: "data", type: "object", label: "The full payload your webhook template sends" },
];

const SAMPLE: MarketoLeadEvent = {
  leadId: "1001",
  email: "ada@example.com",
  campaign: "Welcome series",
  data: {
    leadId: "1001",
    email: "ada@example.com",
    firstName: "Ada",
    lastName: "Lovelace",
    campaign: "Welcome series",
  },
};

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** The delivery body: a JSON object, else a form-encoded body. Anything else is refused. */
export function parsePayload(body: string): Record<string, unknown> {
  try {
    const obj = asObject(JSON.parse(body));
    if (obj) return obj;
  } catch { /* not JSON: try the form encoding */ }
  const form = new URLSearchParams(body);
  const out: Record<string, unknown> = {};
  for (const [k, v] of form) out[k] = v;
  // A JSON array or a malformed JSON object is not a form either.
  if (/^\s*[\[{]/.test(body) || Object.keys(out).length === 0) {
    throw new Error("Not a Marketo webhook delivery: expected a JSON object or form fields.");
  }
  return out;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
}

/** Build the Marketo "Call Webhook" trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<Record<string, never>, MarketoLeadEvent, { callbackUrl: string }> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [],
    output: OUTPUT,
    sample: SAMPLE,

    // Manual webhook: the URL is entered in a Marketo webhook; nothing to register.
    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },
    onUnsubscribe() {},

    handleIngest({ raw }) {
      const method = raw.method.toUpperCase();
      if (method !== "POST" && method !== "PUT" && method !== "PATCH") {
        throw new Error(
          `Marketo webhooks with a payload use POST, PUT or PATCH, not ${raw.method}.`,
        );
      }
      const data = parsePayload(requireRawBody(raw));
      return [{
        leadId: str(data.leadId),
        email: str(data.email),
        campaign: str(data.campaign),
        data,
      }];
    },
  };
}
