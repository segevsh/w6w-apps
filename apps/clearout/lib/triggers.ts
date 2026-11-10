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
 * Clearout webhook triggers (rfcs/trigger.md, webhook form, manual receiver).
 *
 *   - Clearout webhooks are created in the app (Developers, Webhook), not through the API, so
 *     `onSubscribe` makes no Clearout call: it hands back the `callbackUrl` the user pastes there
 *     and `onUnsubscribe` is a no-op.
 *   - Clearout signs each delivery with the ACCOUNT-level secret token (D5 (2): the user pastes
 *     it): `x-co-webhook-signature: t=<unix seconds>,v1=<hex>`, the hex HMAC-SHA256 of
 *     `<t>.<raw body>`. `handleIngest` verifies it, and that `t` is within five minutes of now
 *     (Clearout recommends 2 minutes and allows 2 to 5), BEFORE it parses anything.
 *
 * Trust model: the signature covers the timestamp and the exact body, so a delivery cannot be
 * edited, only replayed inside the window. Clearout's own samples re-serialise the parsed body
 * (JSON.stringify) while its prose and Python sample use the raw body; the raw body is what is
 * verified here, as the prose requires.
 *
 * Docs (verified 2026-11-10): https://docs.clearout.io/developers/webhooks/validate-deliveries,
 * https://docs.clearout.io/developers/webhooks/set-up-and-edit-webhooks and
 * https://docs.clearout.io/developers/webhooks/webhook-events-and-payloads
 */

export interface TriggerParams {
  signingSecret?: string;
  /** Any-event trigger only: comma-separated Clearout `event_type` names; empty = all. */
  events?: string;
}

/** The run's `trigger.event`: one Clearout webhook event. */
export interface ClearoutEvent {
  eventId: string | null;
  eventType: string;
  eventMode: string | null;
  createdAt: string | null;
  status: string | null;
  data: Record<string, unknown>;
  /** The whole delivery, exactly as Clearout sent it. */
  payload: Record<string, unknown>;
}

const SIGNING_SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "Secret Token",
  type: "secret",
  required: true,
  hint:
    "Clearout app, Developers, Webhook, Secret Token (generated once per account and shown only when generated or rotated). Clearout signs every delivery with it; a delivery that does not verify is refused.",
};

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  hint:
    "Comma-separated Clearout event types to react to, e.g. `email_verifier.instant.completed, form_guard.phone_validation.completed`. Leave empty for every event the webhook sends.",
};

/** `a, b ,c` → `["a","b","c"]` (empty entries dropped). */
export function parseEvents(v: unknown): string[] {
  return typeof v === "string" ? v.split(",").map((e) => e.trim()).filter((e) => e !== "") : [];
}

const OUTPUT: OutputField[] = [
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "eventType", type: "string", label: "Event Type" },
  { key: "eventMode", type: "string", label: "Mode (live or test)" },
  { key: "createdAt", type: "string", label: "Created At" },
  { key: "status", type: "string", label: "Status" },
  { key: "data", type: "object", label: "Event Data" },
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

/** The delivery body → its event. Throws on a body that is not a Clearout event. */
export function normalizeDelivery(body: unknown): ClearoutEvent {
  const d = asObject(body);
  const eventType = str(d?.event_type);
  if (!d || !eventType) {
    throw new Error("Not a Clearout webhook delivery: expected `event_type`.");
  }
  const payload = asObject(d.payload);
  return {
    eventId: str(d.event_id),
    eventType,
    eventMode: str(d.event_mode),
    // One sample in Clearout's docs spells it `event_on`.
    createdAt: str(d.event_created_on) ?? str(d.event_on),
    status: str(payload?.status),
    data: asObject(payload?.data) ?? {},
    payload: d,
  };
}

/** `t=<seconds>,v1=<hex>` → its two parts, or null when either is missing. */
function parseSignature(given: string): { t: string; v1: string } | null {
  let t: string | undefined;
  let v1: string | undefined;
  for (const part of given.split(",")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === "t") t = v;
    else if (k === "v1") v1 = v;
  }
  return t && v1 ? { t, v1 } : null;
}

/**
 * Check `x-co-webhook-signature` against the exact bytes received and the clock. Returns the raw
 * body. Throws (never echoing the secret, the signature or the header) unless it verifies; an
 * unset secret is refused before any compare.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
  nowMs: number = Date.now(),
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const given = header(raw, "x-co-webhook-signature");
  if (given === undefined || given === "") {
    throw new Error("Clearout delivery refused: the x-co-webhook-signature header is missing.");
  }
  const parts = parseSignature(given);
  if (!parts || !/^\d+$/.test(parts.t)) {
    throw new Error("Clearout delivery refused: the signature header is malformed.");
  }
  const expected = await hmac("SHA-256", key, `${parts.t}.${body}`, "hex");
  if (!timingSafeEqual(expected, parts.v1)) {
    throw new Error("Clearout delivery refused: the signature does not match.");
  }
  if (!withinTolerance(Number(parts.t), nowMs)) {
    throw new Error(
      "Clearout delivery refused: the signature timestamp is outside the allowed window.",
    );
  }
  return body;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The Clearout `event_type` this trigger fires on; omit for the Any-event trigger. */
  eventType?: string;
  /** Any-event trigger: adds the `events` param and keeps only the event types it lists. */
  anyEvent?: boolean;
  sample: ClearoutEvent;
}

/** Build one Clearout event-type webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, ClearoutEvent, { callbackUrl: string }> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.anyEvent ? [SIGNING_SECRET_PARAM, EVENTS_PARAM] : [SIGNING_SECRET_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Clearout delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, params?.signingSecret);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Clearout delivery refused: the body is not JSON.");
      }
      const event = normalizeDelivery(parsed);
      // Other event types (and Clearout's dashboard test events of another type) are acknowledged
      // without a run.
      if (spec.eventType !== undefined && event.eventType !== spec.eventType) return [];
      if (spec.anyEvent) {
        const wanted = parseEvents(params?.events);
        if (wanted.length > 0 && !wanted.includes(event.eventType)) return [];
      }
      return [event];
    },
  };
}
