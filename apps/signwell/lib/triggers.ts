import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";
import { SignWellClient } from "./client.ts";

/**
 * SignWell webhook triggers (rfcs/trigger.md, webhook form, API-registered and signed).
 *
 *   - `onSubscribe` registers the callback URL with `POST /api/v1/hooks` and keeps the webhook id
 *     SignWell returns in the subscription `state`.
 *   - `onUnsubscribe` deletes it with `DELETE /api/v1/hooks/{id}`; a webhook SignWell no longer has
 *     (404) counts as deleted.
 *   - `handleIngest` verifies `event.hash` BEFORE it emits anything: hex HMAC-SHA256 of
 *     `<event.type>@<event.time>` keyed with the webhook id (SignWell's own "Event Hash
 *     Verification" page), compared in constant time, and refuses an `event.time` more than five
 *     minutes from now. An unset webhook id is refused before any compare.
 *
 * Trust model: SignWell signs the event type and time, NOT the body. A valid hash proves the
 * sender knows the webhook id and the delivery is recent; it does not bind `data.object`. A captured
 * (type, time, hash) triple could carry a different body for five minutes. The webhook id is the key
 * and is only ever read back from the subscription state, never from the delivery.
 *
 * SignWell registers a callback for ALL events (the create call has no event list), so each trigger
 * registers its own hook and drops the events it was not asked for.
 *
 * Docs (verified 2026-11-10): https://developers.signwell.com/reference/events,
 * https://developers.signwell.com/reference/event-data,
 * https://developers.signwell.com/reference/event-hash-verification and
 * https://developers.signwell.com/reference/createwebhook
 */

export interface TriggerParams {
  events?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  /** The SignWell webhook id: also the key SignWell signs `event.hash` with. */
  webhookId: string;
}

/** The run's `trigger.event`: one SignWell document or template event. */
export interface SignWellEvent {
  type: string;
  time: number;
  objectId: string | null;
  name: string | null;
  status: string | null;
  relatedSigner: { name: string | null; email: string | null } | null;
  accountId: string | null;
  object: Record<string, unknown>;
}

/** Every event SignWell's Events page lists. */
export const ALL_EVENTS = [
  "document_created",
  "document_sent",
  "document_viewed",
  "document_in_progress",
  "document_recipients_updated",
  "document_signed",
  "document_completed",
  "document_expired",
  "document_canceled",
  "document_declined",
  "document_bounced",
  "document_error",
  "template_created",
  "template_error",
  "template_available",
  "template_unavailable",
  "document_sms_failed",
  "document_sms_opted_out",
];

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  advanced: true,
  hint: `Comma-separated SignWell events to fire on: ${
    ALL_EVENTS.join(", ")
  }. Leave empty for all of them.`,
};

const OUTPUT: OutputField[] = [
  { key: "type", type: "string", label: "Event type" },
  { key: "time", type: "number", label: "Event time (epoch seconds)" },
  { key: "objectId", type: "string", label: "Document or template ID" },
  { key: "name", type: "string", label: "Document or template name" },
  { key: "status", type: "string", label: "Status" },
  { key: "relatedSigner", type: "object", label: "Signer the event is about" },
  { key: "accountId", type: "string", label: "Account ID" },
  { key: "object", type: "object", label: "Full document or template" },
];

const SAMPLE: SignWellEvent = {
  type: "document_completed",
  time: 1762683300,
  objectId: "a692e1ce-9929-4541-adc7-61932bab39d3",
  name: "Example contract",
  status: "Completed",
  relatedSigner: null,
  accountId: "7c98753-0acc-46ab-84b0-e96d085983e0",
  object: {
    id: "a692e1ce-9929-4541-adc7-61932bab39d3",
    name: "Example contract",
    status: "Completed",
    recipients: [{ id: "1", name: "Ada Lovelace", email: "ada@example.com" }],
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

/** True for the "no such webhook" answer `SignWellClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^SignWell 404\b/.test(err.message);
}

/** The user's event list (default: `fallback`) → validated names. */
export function chooseEvents(raw: string | undefined, fallback: string[] = ALL_EVENTS): string[] {
  const wanted = (raw ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (wanted.length === 0) return fallback;
  const bad = wanted.filter((e) => !ALL_EVENTS.includes(e));
  if (bad.length > 0) {
    throw new Error(`Unknown SignWell event(s): ${bad.join(", ")}. Use ${ALL_EVENTS.join(", ")}.`);
  }
  return [...new Set(wanted)];
}

/**
 * Verify `event.hash` against the webhook id and the clock. Returns the parsed body. Throws (never
 * echoing the webhook id, the hash or the body) unless it verifies; an unset webhook id is refused
 * before any compare. `data.object` is NOT covered by the hash.
 */
export async function verifyDelivery(
  raw: { rawBody?: unknown },
  webhookId: unknown,
  nowMs: number = Date.now(),
): Promise<Record<string, unknown>> {
  const key = requireSecret(webhookId);
  const body = requireRawBody(raw);
  let parsed: Record<string, unknown> | null;
  try {
    parsed = asObject(JSON.parse(body));
  } catch {
    parsed = null;
  }
  const event = asObject(parsed?.event);
  const type = str(event?.type);
  const hash = str(event?.hash);
  const rawTime = event?.time;
  const time = typeof rawTime === "number" && Number.isSafeInteger(rawTime)
    ? rawTime
    : typeof rawTime === "string" && /^\d{1,15}$/.test(rawTime)
    ? Number(rawTime)
    : null;
  if (!parsed || !type || !hash || time === null) {
    throw new Error("SignWell delivery refused: the event type, time or hash is missing.");
  }
  if (!withinTolerance(time, nowMs)) {
    throw new Error("SignWell delivery refused: the event time is outside the allowed window.");
  }
  const expected = await hmac("SHA-256", key, `${type}@${time}`, "hex");
  if (!timingSafeEqual(expected, hash)) {
    throw new Error("SignWell delivery refused: the event hash does not match.");
  }
  return parsed;
}

/** The verified delivery → its event. */
export function normalizeDelivery(parsed: Record<string, unknown>): SignWellEvent {
  const event = asObject(parsed.event) ?? {};
  const data = asObject(parsed.data);
  const object = asObject(data?.object) ?? {};
  const signer = asObject(event.related_signer) ?? asObject(event.related_recipient);
  return {
    type: String(event.type),
    time: Number(event.time),
    objectId: str(object.id),
    name: str(object.name),
    status: str(object.status),
    relatedSigner: signer
      ? { name: str(signer.name), email: str(signer.email)?.trim() ?? null }
      : null,
    accountId: str(data?.account_id),
    object,
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The events this trigger fires on. Absent: the user picks with the `events` param. */
  events?: string[];
  /** Fields of the sample that differ from the default completed-document one. */
  sample?: Partial<SignWellEvent>;
}

/** Build one SignWell webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, SignWellEvent, TriggerState> {
  const wanted = (params?: TriggerParams) => spec.events ?? chooseEvents(params?.events);
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.events ? [] : [EVENTS_PARAM],
    output: OUTPUT,
    sample: { ...SAMPLE, ...(spec.events ? { type: spec.events[0] } : {}), ...spec.sample },

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      wanted(params); // refuse an unknown event name before registering anything
      const made = await new SignWellClient(ctx).request<{ id?: unknown }>("/hooks", {
        method: "POST",
        body: { callback_url: callbackUrl },
      });
      const webhookId = str(made?.id);
      if (!webhookId) throw new Error("SignWell did not return a webhook id for the registration.");
      return { webhookId };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const id = str((state as Partial<TriggerState> | undefined)?.webhookId);
      if (!id) return;
      try {
        await new SignWellClient(ctx).request(`/hooks/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, params, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`SignWell delivers webhooks with POST, not ${raw.method}.`);
      }
      const parsed = await verifyDelivery(
        raw,
        (state as Partial<TriggerState> | undefined)?.webhookId,
      );
      const event = normalizeDelivery(parsed);
      if (!wanted(params).includes(event.type)) return [];
      return [event];
    },
  };
}
