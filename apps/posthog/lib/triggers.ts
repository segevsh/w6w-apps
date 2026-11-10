import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";

/**
 * PostHog webhook trigger (rfcs/trigger.md, webhook form, MANUAL registration).
 *
 * This trigger does not register a receiver on the host's behalf (PostHog's
 * `POST /api/projects/:project_id/hog_functions/` can create destinations,
 * https://posthog.com/docs/api/hog-functions, but registering through it is not built here): the
 * user adds an "HTTP Webhook" realtime destination in the PostHog UI (Data pipelines, + New,
 * Destination) and pastes the callback URL. `onSubscribe` therefore makes no vendor call and
 * returns the callback URL; `onUnsubscribe` is a no-op (the user disables the destination in
 * PostHog).
 *
 * Signing: that destination has an optional "Signing secret" input which, when set, signs every
 * request per the Standard Webhooks spec. This trigger REQUIRES it (a vendor that can sign is
 * never accepted unsigned): `handleIngest` verifies
 *
 *   webhook-signature: v1,<base64 HMAC-SHA256 of "<webhook-id>.<webhook-timestamp>.<raw body>">
 *
 * under the base64-decoded secret (an optional `whsec_` prefix stripped), accepting any one of
 * the space-separated signatures, and rejects a timestamp more than five minutes from now,
 * BEFORE it parses the body.
 *
 * Trust model: the signature binds id, timestamp and the whole body, so a captured delivery is
 * only replayable inside the five-minute window; `webhook-id` (exposed as `webhookId`) is
 * constant across PostHog's retries and is the de-dupe key.
 *
 * Docs (verified 2026-11-10): https://posthog.com/docs/data-pipelines/destinations/webhook (setup);
 * the signing input and algorithm are in PostHog's open-source destination,
 * https://github.com/PostHog/posthog/blob/master/nodejs/src/cdp/templates/_destinations/webhook/webhook.template.ts
 * and https://github.com/PostHog/posthog/blob/master/nodejs/src/cdp/utils/standard-webhooks.ts,
 * against https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md
 */

export interface TriggerParams {
  signingSecret?: string;
  /** Comma-separated PostHog event names (`$pageview`, `signed_up`); empty = every event. */
  events?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  callbackUrl: string;
}

/** The run's `trigger.event`: one PostHog event, as the destination's body template sent it. */
export interface PostHogEvent {
  eventName: string | null;
  eventId: string | null;
  distinctId: string | null;
  timestamp: string | null;
  properties: Record<string, unknown>;
  person: Record<string, unknown> | null;
  webhookId: string | null;
  data: Record<string, unknown>;
}

const SIGNING_SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "Signing secret",
  type: "secret",
  required: true,
  hint:
    'The same value you typed into the PostHog webhook destination\'s "Signing secret" field (base64, at least 24 bytes decoded, optionally prefixed whsec_). Every delivery is verified with it; one that does not verify is refused.',
};

const OUTPUT: OutputField[] = [
  { key: "eventName", type: "string", label: "Event name" },
  { key: "eventId", type: "string", label: "Event UUID" },
  { key: "distinctId", type: "string", label: "Distinct ID" },
  { key: "timestamp", type: "string", label: "Event timestamp" },
  { key: "properties", type: "object", label: "Event properties" },
  { key: "person", type: "object", label: "Person" },
  { key: "webhookId", type: "string", label: "Delivery ID (webhook-id; same across retries)" },
  { key: "data", type: "object", label: "Full request body" },
];

const SAMPLE: PostHogEvent = {
  eventName: "$pageview",
  eventId: "0192b2ae-0000-7000-8000-000000000001",
  distinctId: "user-123",
  timestamp: "2026-11-10T10:30:00.000Z",
  properties: { $current_url: "https://example.com/pricing" },
  person: { id: "0192b2ae-0000-7000-8000-000000000002", properties: { email: "ada@example.com" } },
  webhookId: "sample-webhook-id",
  data: {
    event: { event: "$pageview", distinct_id: "user-123" },
    person: { id: "0192b2ae-0000-7000-8000-000000000002" },
  },
};

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

/** Standard Webhooks secret → HMAC key bytes (`whsec_` prefix optional, base64 body). */
export function secretKeyBytes(secret: string): Uint8Array {
  const encoded = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new Error("PostHog delivery refused: the signing secret is not valid base64.");
  }
  const bin = atob(encoded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Verify the delivery's Standard Webhooks signature and clock, and return the RAW body it
 * covers. Throws (never echoing the secret, the signature or the body) unless it verifies; an
 * unset secret is refused before any compare.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
  nowMs: number = Date.now(),
): Promise<string> {
  const secretText = requireSecret(secret);
  const body = requireRawBody(raw);
  const id = header(raw, "webhook-id");
  const timestamp = header(raw, "webhook-timestamp");
  const signatures = header(raw, "webhook-signature");
  if (!id || !timestamp || !signatures) {
    throw new Error(
      "PostHog delivery refused: a webhook-id, webhook-timestamp or webhook-signature header is missing.",
    );
  }
  if (!/^\d+$/.test(timestamp.trim()) || !withinTolerance(Number(timestamp), nowMs)) {
    throw new Error("PostHog delivery refused: the timestamp is outside the allowed window.");
  }
  const key = secretKeyBytes(secretText.trim());
  const expected = await hmac("SHA-256", key, `${id}.${timestamp.trim()}.${body}`, "base64");
  // Compare against EVERY v1 candidate (no early exit) so timing does not reveal which matched.
  let ok = false;
  for (const candidate of signatures.trim().split(/\s+/)) {
    const [version, value] = candidate.split(",");
    if (version === "v1" && value && timingSafeEqual(expected, value)) ok = true;
  }
  if (!ok) throw new Error("PostHog delivery refused: the signature does not match.");
  return body;
}

/** The verified delivery → its normalized event (the destination's default body or a custom one). */
export function normalizeDelivery(body: string, headers: Record<string, string>): PostHogEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("Not a PostHog webhook delivery: the body is not JSON.");
  }
  const d = asObject(parsed);
  if (!d) throw new Error("Not a PostHog webhook delivery: expected a JSON object.");
  const ev = asObject(d.event);
  return {
    eventName: str(ev?.event) ?? str(d.event),
    eventId: str(ev?.uuid) ?? str(d.uuid),
    distinctId: str(ev?.distinct_id) ?? str(d.distinct_id),
    timestamp: str(ev?.timestamp) ?? str(d.timestamp),
    properties: asObject(ev?.properties) ?? asObject(d.properties) ?? {},
    person: asObject(d.person),
    webhookId: str(header({ headers }, "webhook-id")),
    data: d,
  };
}

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  hint:
    "Comma-separated PostHog event names to run on, e.g. $pageview,signed_up. Leave empty for every event the destination forwards. Set the same filter on the PostHog destination so it only sends these.",
};

/** The event names a trigger accepts: its fixed list, or the user's `events` param (empty = all). */
function acceptedEvents(spec: WebhookTriggerSpec, params?: TriggerParams): string[] {
  if (spec.events) return spec.events;
  return (params?.events ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** Fixed event names this trigger runs on (a named trigger); other events are acknowledged, no run. */
  events?: string[];
  /** Offer the `events` filter param (the Any-event trigger). Ignored when `events` is fixed. */
  eventsParam?: boolean;
  /** Replaces the default sample (fields merged over it). */
  sample?: Partial<PostHogEvent>;
}

/** Build the PostHog event webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, PostHogEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.eventsParam && !spec.events
      ? [SIGNING_SECRET_PARAM, EVENTS_PARAM]
      : [SIGNING_SECRET_PARAM],
    output: OUTPUT,
    sample: { ...SAMPLE, ...spec.sample },

    // Manual webhook: nothing to register at PostHog. The user pastes this URL into the
    // destination; it is kept in state so the README/UI can show it.
    onSubscribe({ callbackUrl }, _ctx: HookContext) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`PostHog delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, params?.signingSecret);
      const event = normalizeDelivery(body, raw.headers);
      const accepted = acceptedEvents(spec, params);
      if (
        accepted.length > 0 && !(event.eventName !== null && accepted.includes(event.eventName))
      ) {
        return [];
      }
      return [event];
    },
  };
}
