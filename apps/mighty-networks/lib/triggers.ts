import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";

/**
 * Mighty Networks webhook triggers (rfcs/trigger.md, webhook form, manual setup).
 *
 * Mighty Networks has no webhook-registration API: the Network owner adds the callback URL, picks
 * the events and sets an API key for the webhook in the Network settings. Each delivery is a JSON
 * POST `{ event_id, event_timestamp, event_type, payload }` carrying `Authorization: Bearer <that
 * key>`. There is NO signature: the key travels with every delivery, so the check is a shared-secret
 * compare, not a proof over the body. The callback URL should stay private as well.
 *
 * `handleIngest` therefore: requires the pasted key (`requireSecret`) and the raw body, compares the
 * bearer token in constant time, and only then parses. A failure throws and never echoes the key.
 *
 * Docs (verified 2026-11-10): https://docs.mightynetworks.com/api/webhooks.md and the machine-
 * readable event schemas at https://api.mn.co/webhooks/v1/spec.json
 */

export interface TriggerParams {
  webhookKey: string;
  events?: string;
}

/** The run's `trigger.event`: one Mighty Networks webhook delivery. */
export interface NetworkEvent {
  eventId: string | null;
  eventType: string | null;
  eventTimestamp: string | null;
  payload: Record<string, unknown>;
}

const WEBHOOK_KEY_PARAM: Param = {
  key: "webhookKey",
  label: "Webhook API key",
  type: "secret",
  required: true,
  hint:
    "The API key you set on the webhook in your Network settings. Mighty Networks sends it as a Bearer token in the Authorization header of every delivery; a delivery without it is refused.",
};

const OUTPUT: OutputField[] = [
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "eventType", type: "string", label: "Event type (e.g. MemberJoined)" },
  { key: "eventTimestamp", type: "string", label: "Event timestamp (ISO 8601)" },
  { key: "payload", type: "object", label: "Event payload (the member, post, event ... object)" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

/** `PostCreatedHook` (prose example) and `PostCreated` (event schema name) are the same event. */
export function normalizeEventType(v: unknown): string | null {
  const s = str(v);
  return s ? s.replace(/Hook$/, "") : null;
}

/** The comma-separated event filter → normalized event names. */
export function parseEventFilter(raw: string | undefined): string[] {
  return (raw ?? "").split(",").map((s) => normalizeEventType(s.trim())).filter((s): s is string =>
    s !== null
  );
}

/**
 * Check the bearer token against the pasted key, then parse the raw body into an event. Throws
 * (never echoing the key or the token) on a missing key, a missing or wrong token, or a body that
 * is not a Mighty Networks delivery.
 */
export function verifyDelivery(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  webhookKey: unknown,
): NetworkEvent {
  const key = requireSecret(webhookKey);
  const body = requireRawBody(raw);
  const auth = header(raw, "authorization");
  const m = typeof auth === "string" ? /^Bearer\s+(\S+)$/i.exec(auth.trim()) : null;
  if (!m) {
    throw new Error("Mighty Networks delivery refused: the bearer token is missing.");
  }
  if (!timingSafeEqual(m[1], key)) {
    throw new Error("Mighty Networks delivery refused: the bearer token does not match.");
  }
  let parsed: Record<string, unknown> | null;
  try {
    parsed = asObject(JSON.parse(body));
  } catch {
    parsed = null;
  }
  const payload = asObject(parsed?.payload);
  if (!parsed || !payload) {
    throw new Error("Not a Mighty Networks webhook delivery: expected a JSON payload object.");
  }
  return {
    eventId: str(parsed.event_id),
    eventType: normalizeEventType(parsed.event_type),
    eventTimestamp: str(parsed.event_timestamp),
    payload,
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** Normalized event types this trigger fires on; empty = any (the user can narrow with `events`). */
  eventTypes: string[];
  sample: NetworkEvent;
}

/** Build one Mighty Networks webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, NetworkEvent, { callbackUrl: string }> {
  const generic = spec.eventTypes.length === 0;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: generic
      ? [WEBHOOK_KEY_PARAM, {
        key: "events",
        label: "Only these events",
        type: "string",
        advanced: true,
        hint:
          "Comma-separated Mighty Networks event names, e.g. PostCreated,MemberPurchased. Leave empty for every event the webhook sends.",
      }]
      : [WEBHOOK_KEY_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    // Manual webhook: nothing to register, the Network owner pastes the callback URL.
    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },
    onUnsubscribe() {},

    handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Mighty Networks delivers webhooks with POST, not ${raw.method}.`);
      }
      const event = verifyDelivery(raw, params?.webhookKey);
      const wanted = generic ? parseEventFilter(params?.events) : spec.eventTypes;
      if (wanted.length === 0) return [event];
      if (event.eventType === null) {
        if (generic) return [event];
        throw new Error("Mighty Networks delivery has no event_type, so it cannot be classified.");
      }
      return wanted.includes(event.eventType) ? [event] : [];
    },
  };
}
