import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";

/**
 * Airparser webhook trigger (rfcs/trigger.md, webhook form, manual receiver).
 *
 *   - Airparser webhooks are created in the dashboard (Integrations, Webhooks), not through the
 *     Public API this app calls, so `onSubscribe` makes no Airparser call: it hands back the
 *     `callbackUrl` the user pastes there and `onUnsubscribe` is a no-op.
 *   - Airparser signs each delivery with the webhook's own Signing Secret (D5 (2): the user pastes
 *     it): `airparser-signature` is the base64 HMAC-SHA256 of the exact request body.
 *     `handleIngest` verifies it BEFORE it parses anything, then emits one event.
 *
 * Trust model: the signature covers the body but carries no timestamp, so a captured delivery can
 * be replayed. Airparser documents the payload only as "similar to GET /docs/{id}", so the event
 * maps the fields that response documents and keeps the whole payload in `payload`.
 *
 * Docs (verified 2026-11-10): https://help.airparser.com/data-export-integrations/webhooks and
 * https://help.airparser.com/public-api/public-api
 */

export interface TriggerParams {
  signingSecret?: string;
}

/** The run's `trigger.event`: one parsed document. */
export interface AirparserEvent {
  documentId: string | null;
  name: string | null;
  filename: string | null;
  contentType: string | null;
  status: string | null;
  createdAt: string | null;
  processedAt: string | null;
  credits: number | null;
  /** The extracted fields (the document's `json`), `null` when the payload carries none. */
  json: Record<string, unknown> | null;
  /** The whole delivery, exactly as Airparser sent it. */
  payload: Record<string, unknown>;
}

const SIGNING_SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "Signing Secret",
  type: "secret",
  required: true,
  hint:
    "Airparser, Integrations, Webhooks, your webhook, Signing Secret. Airparser signs every delivery with it; a delivery that does not verify is refused.",
};

const OUTPUT: OutputField[] = [
  { key: "documentId", type: "string", label: "Document ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "filename", type: "string", label: "File Name" },
  { key: "contentType", type: "string", label: "Content Type" },
  { key: "status", type: "string", label: "Status" },
  { key: "createdAt", type: "string", label: "Created At" },
  { key: "processedAt", type: "string", label: "Processed At" },
  { key: "credits", type: "number", label: "Credits Used" },
  { key: "json", type: "object", label: "Extracted Data" },
  { key: "payload", type: "object", label: "Full Payload" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** The delivery body → its event. Throws on a body that is not a JSON object. */
export function normalizeDelivery(body: unknown): AirparserEvent {
  const d = asObject(body);
  if (!d) throw new Error("Not an Airparser webhook delivery: expected a JSON object.");
  return {
    documentId: str(d._id) ?? str(d.id) ?? str(d.doc_id),
    name: str(d.name),
    filename: str(d.filename),
    contentType: str(d.content_type),
    status: str(d.status),
    createdAt: str(d.created_at),
    processedAt: str(d.processed_at),
    credits: typeof d.credits === "number" ? d.credits : null,
    json: asObject(d.json),
    payload: d,
  };
}

/**
 * Check `airparser-signature` against the exact bytes received. Returns the raw body. Throws (never
 * echoing the secret, the signature or the header) unless it matches; an unset secret is refused
 * before any compare.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const given = header(raw, "airparser-signature");
  if (given === undefined || given === "") {
    throw new Error("Airparser delivery refused: the airparser-signature header is missing.");
  }
  const expected = await hmac("SHA-256", key, body, "base64");
  if (!timingSafeEqual(expected, given)) {
    throw new Error("Airparser delivery refused: the signature does not match.");
  }
  return body;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  sample: AirparserEvent;
}

/** Build the Airparser parsed-document webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, AirparserEvent, { callbackUrl: string }> {
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
        throw new Error(`Airparser delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, params?.signingSecret);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Airparser delivery refused: the body is not JSON.");
      }
      return [normalizeDelivery(parsed)];
    },
  };
}
