import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";

/**
 * Formspark webhook trigger (rfcs/trigger.md, webhook form, manual receiver).
 *
 *   - Formspark has no webhook API: the URL is set per form in the dashboard (Integrations, Webhook
 *     row). `onSubscribe` therefore makes no Formspark call: it hands back the `callbackUrl` the
 *     user pastes there, and `onUnsubscribe` is a no-op (clearing the URL in the dashboard stops
 *     deliveries).
 *   - Signing is OPTIONAL on Formspark's side ("Sign deliveries" in the Webhook row). This trigger
 *     requires it (D5 (2): the user pastes the secret the dashboard shows): an unsigned delivery is
 *     never accepted. `Formspark-Signature` is `v1=` + the hex HMAC-SHA256 of
 *     `<Formspark-Timestamp>.<raw body>` under the secret; a timestamp more than five minutes from
 *     the clock is refused.
 *   - The body is the form's submitted fields, with control fields (names starting with `_`) and spam
 *     tokens left out; the submission id travels in the `Formspark-Submission-Id` header, the same for
 *     every retry of one submission.
 *
 * Docs (verified 2026-11-10): https://documentation.formspark.io/integration/webhooks.html
 */

export interface TriggerParams {
  signingSecret?: string;
}

/** The run's `trigger.event`: one accepted form submission. */
export interface SubmissionEvent {
  submissionId: string | null;
  sentAt: string | null;
  fields: Record<string, unknown>;
}

const SIGNING_SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "Signing Secret",
  type: "secret",
  required: true,
  hint:
    "In the form's settings, Integrations, Webhook row: turn on Sign deliveries and copy the secret it shows. Formspark signs every delivery with it; a delivery that does not verify is refused.",
};

const OUTPUT: OutputField[] = [
  { key: "submissionId", type: "string", label: "Submission ID" },
  { key: "sentAt", type: "string", label: "Sent At (ISO 8601)" },
  { key: "fields", type: "object", label: "Submitted Fields" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

/**
 * Check `Formspark-Signature` against the exact bytes received and the clock. Throws (never
 * echoing the secret, the signature or any header) unless it matches; an unset secret is refused
 * before any compare. Returns the verified body text.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
  nowMs: number = Date.now(),
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const given = header(raw, "formspark-signature");
  if (given === undefined || given === "") {
    throw new Error("Formspark delivery refused: the Formspark-Signature header is missing.");
  }
  const timestamp = header(raw, "formspark-timestamp");
  if (timestamp === undefined || !/^\d+$/.test(timestamp)) {
    throw new Error("Formspark delivery refused: the Formspark-Timestamp header is missing.");
  }
  if (!withinTolerance(Number(timestamp), nowMs)) {
    throw new Error("Formspark delivery refused: the timestamp is outside the allowed window.");
  }
  const expected = `v1=${await hmac("SHA-256", key, `${timestamp}.${body}`, "hex")}`;
  if (!timingSafeEqual(expected, given)) {
    throw new Error("Formspark delivery refused: the signature does not match.");
  }
  return body;
}

/** The verified delivery → its event. Throws on a body that is not a JSON object of fields. */
export function normalizeDelivery(
  body: string,
  submissionId: string | undefined,
  timestamp: string | undefined,
): SubmissionEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("Formspark delivery refused: the body is not JSON.");
  }
  const fields = asObject(parsed);
  if (!fields) throw new Error("Not a Formspark webhook delivery: expected a JSON object.");
  const seconds = timestamp && /^\d+$/.test(timestamp) ? Number(timestamp) : null;
  return {
    submissionId: submissionId && submissionId !== "" ? submissionId : null,
    sentAt: seconds === null ? null : new Date(seconds * 1000).toISOString(),
    fields,
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  sample: SubmissionEvent;
}

/** Build the Formspark submission webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, SubmissionEvent, { callbackUrl: string }> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [SIGNING_SECRET_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Formspark delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, params?.signingSecret);
      return [
        normalizeDelivery(
          body,
          header(raw, "formspark-submission-id"),
          header(raw, "formspark-timestamp"),
        ),
      ];
    },
  };
}
