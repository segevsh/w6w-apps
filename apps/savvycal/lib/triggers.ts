import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { SavvyCalClient } from "./client.ts";

/**
 * SavvyCal webhook triggers (rfcs/trigger.md, webhook form, API-registered).
 *
 *   - `onSubscribe` registers the callback URL with `POST /v1/webhooks` (`{ url }`). SavvyCal
 *     answers with the webhook `id` and the `secret` that signs its deliveries; both are kept in
 *     the subscription `state` (D5 (1): the vendor mints the secret, the host stores it).
 *   - `onUnsubscribe` deletes it with `DELETE /v1/webhooks/{id}`; a webhook SavvyCal no longer
 *     has (404) counts as deleted.
 *   - `handleIngest` verifies `x-savvycal-signature` (`sha256=` + the hex HMAC-SHA256 of the RAW
 *     request body under the webhook secret) BEFORE it parses the body, then keeps only the
 *     delivery type this trigger is for.
 *
 * Trust model: the signature binds the whole body, but SavvyCal sends no timestamp in it, so a
 * captured delivery can be replayed as-is. The payload `id` (`payload_...`) is the dedupe key.
 *
 * Docs (verified 2026-11-10): https://docs.savvycal.com/developers/webhooks,
 * https://docs.savvycal.com/developers/v1/api/schemas/webhook.md and
 * https://docs.savvycal.com/developers/v1/api/schemas/createwebhookrequest.md
 */

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  /** The webhook's signing secret, as SavvyCal returned it on create. */
  secret: string;
}

/** The run's `trigger.event`: one SavvyCal event delivery. */
export interface SavvyCalEvent {
  type: string;
  deliveryId: string | null;
  occurredAt: string | null;
  eventId: string | null;
  summary: string | null;
  state: string | null;
  startAt: string | null;
  endAt: string | null;
  duration: number | null;
  linkId: string | null;
  linkName: string | null;
  organizerName: string | null;
  organizerEmail: string | null;
  attendees: unknown[];
  url: string | null;
  cancelReason: string | null;
  rescheduleReason: string | null;
  data: Record<string, unknown>;
}

const OUTPUT: OutputField[] = [
  { key: "type", type: "string", label: "Delivery type (e.g. event.created)" },
  { key: "deliveryId", type: "string", label: "Delivery ID (payload_...)" },
  { key: "occurredAt", type: "string", label: "Occurred at" },
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "summary", type: "string", label: "Summary" },
  { key: "state", type: "string", label: "Event state" },
  { key: "startAt", type: "string", label: "Start" },
  { key: "endAt", type: "string", label: "End" },
  { key: "duration", type: "number", label: "Duration (minutes)" },
  { key: "linkId", type: "string", label: "Scheduling link ID" },
  { key: "linkName", type: "string", label: "Scheduling link name" },
  { key: "organizerName", type: "string", label: "Organizer name" },
  { key: "organizerEmail", type: "string", label: "Organizer email" },
  { key: "attendees", type: "array", label: "Attendees" },
  { key: "url", type: "string", label: "Event URL" },
  { key: "cancelReason", type: "string", label: "Cancel reason" },
  { key: "rescheduleReason", type: "string", label: "Reschedule reason" },
  { key: "data", type: "object", label: "Full event object" },
];

function sampleFor(type: string): SavvyCalEvent {
  if (!type.startsWith("event.")) {
    // poll.response.*: the payload is a poll response, not an event.
    return {
      type,
      deliveryId: "payload_7RDQF0G5VT8PAV4ERN90B5Q27Y",
      occurredAt: "2026-11-10T10:30:00Z",
      eventId: null,
      summary: null,
      state: null,
      startAt: null,
      endAt: null,
      duration: null,
      linkId: null,
      linkName: null,
      organizerName: null,
      organizerEmail: null,
      attendees: [],
      url: null,
      cancelReason: null,
      rescheduleReason: null,
      data: {
        id: "pr_01J5KCDZ5PKRFGT8V2WD9Y8H6X",
        display_name: "Ada Lovelace",
        email: "ada@example.com",
        poll: { id: "poll_01J5KCBX3NKRFGT8V2WD9Y8H6X", name: "Meeting with Ada" },
      },
    };
  }
  return {
    type,
    deliveryId: "payload_7RDQF0G5VT8PAV4ERN90B5Q27Y",
    occurredAt: "2026-11-10T10:30:00Z",
    eventId: "event_01KKGY70MFPCECSQ6KM6FMDPC3",
    summary: "30 Minute Meeting with Ada Lovelace",
    state: type === "event.canceled"
      ? "canceled"
      : type === "event.declined"
      ? "declined"
      : type === "event.requested"
      ? "awaiting_approval"
      : "confirmed",
    startAt: "2026-11-20T14:00:00Z",
    endAt: "2026-11-20T14:30:00Z",
    duration: 30,
    linkId: "link_01J5KC2G3MHPCECSQ6KM6FMDPC",
    linkName: "30 Minute Meeting",
    organizerName: "Grace Hopper",
    organizerEmail: "grace@example.com",
    attendees: [{ display_name: "Ada Lovelace", email: "ada@example.com" }],
    url: "https://savvycal.com/events/event_01KKGY70MFPCECSQ6KM6FMDPC3",
    cancelReason: null,
    rescheduleReason: null,
    data: { id: "event_01KKGY70MFPCECSQ6KM6FMDPC3", state: "confirmed", duration: 30 },
  };
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

/** True for the "no such webhook" answer `SavvyCalClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^SavvyCal (404|410)\b/.test(err.message);
}

/**
 * Verify the delivery's signature and return the RAW body it covers. Throws (never echoing the
 * secret, the signature or the body) unless it verifies; an unset secret is refused before any
 * compare. The hex digest is compared case-insensitively (the vendor's own example is uppercase).
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const received = header(raw, "x-savvycal-signature");
  if (!received) {
    throw new Error("SavvyCal delivery refused: the x-savvycal-signature header is missing.");
  }
  const expected = `SHA256=${(await hmac("SHA-256", key, body, "hex")).toUpperCase()}`;
  if (!timingSafeEqual(expected, received.trim().toUpperCase())) {
    throw new Error("SavvyCal delivery refused: the signature does not match.");
  }
  return body;
}

/** The verified delivery body → its normalized event. */
export function normalizeDelivery(body: string): SavvyCalEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("Not a SavvyCal webhook delivery: the body is not JSON.");
  }
  const d = asObject(parsed);
  const type = str(d?.type);
  if (!d || !type) throw new Error("Not a SavvyCal webhook delivery: expected a type.");
  const payload = asObject(d.payload) ?? {};
  // `event.changed`, `event.attendee.*` and `workflow.action.triggered` nest the event under
  // `payload.event`; poll responses carry no event at all. Every other type is flat.
  const p = asObject(payload.event) ?? (type.startsWith("poll.") ? {} : payload);
  const link = asObject(p.link);
  const organizer = asObject(p.organizer);
  return {
    type,
    deliveryId: str(d.id),
    occurredAt: str(d.occurred_at),
    eventId: str(p.id),
    summary: str(p.summary),
    state: str(p.state),
    startAt: str(p.start_at),
    endAt: str(p.end_at),
    duration: typeof p.duration === "number" ? p.duration : null,
    linkId: str(link?.id),
    linkName: str(link?.name),
    organizerName: str(organizer?.display_name),
    organizerEmail: str(organizer?.email),
    attendees: Array.isArray(p.attendees) ? p.attendees : [],
    url: str(p.url),
    cancelReason: str(p.cancel_reason),
    rescheduleReason: str(p.reschedule_reason),
    data: payload,
  };
}

/** Every delivery type SavvyCal documents (https://docs.savvycal.com/developers/webhooks, 2026-11-10). */
export const EVENT_TYPES = [
  "event.created",
  "event.requested",
  "event.approved",
  "event.declined",
  "event.rescheduled",
  "event.changed",
  "event.canceled",
  "event.checkout.pending",
  "event.checkout.expired",
  "event.checkout.completed",
  "event.attendee.added",
  "event.attendee.canceled",
  "event.attendee.rescheduled",
  "poll.response.created",
  "poll.response.updated",
  "workflow.action.triggered",
] as const;

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The SavvyCal delivery type this trigger fires on, e.g. `event.created`. */
  type: string;
  /** Any-event: the user lists delivery types in the `events` param (empty = every type). */
  anyOf?: boolean;
}

/** `events` param → the delivery types to keep; empty = all. Throws on a type SavvyCal does not have. */
export function wantedTypes(events: unknown): Set<string> | null {
  const text = typeof events === "string" ? events : "";
  const list = text.split(",").map((t) => t.trim()).filter((t) => t !== "");
  if (list.length === 0) return null;
  for (const t of list) {
    if (!(EVENT_TYPES as readonly string[]).includes(t)) {
      throw new Error(`Unknown SavvyCal event type "${t.slice(0, 60)}".`);
    }
  }
  return new Set(list);
}

/** Build one SavvyCal event webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<Record<string, unknown>, SavvyCalEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.anyOf
      ? [{
        key: "events",
        label: "Events",
        type: "string",
        default: "",
        hint:
          "Comma-separated SavvyCal event types (event.created, event.changed, poll.response.created, workflow.action.triggered, …). Empty = every type.",
      }]
      : [],
    output: OUTPUT,
    sample: sampleFor(spec.type),

    async onSubscribe({ callbackUrl }, ctx: HookContext) {
      const made = await new SavvyCalClient(ctx).json<{ id?: string; secret?: string }>(
        "/webhooks",
        { method: "POST", body: { url: callbackUrl } },
      );
      if (!made?.id || !made.secret) {
        throw new Error("SavvyCal created the webhook but returned no id or signing secret.");
      }
      return { webhookId: made.id, secret: made.secret };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.webhookId) return;
      try {
        await new SavvyCalClient(ctx).json(`/webhooks/${encodeURIComponent(s.webhookId)}`, {
          method: "DELETE",
        });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, state, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`SavvyCal delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, state?.secret);
      const event = normalizeDelivery(body);
      if (spec.anyOf) {
        const wanted = wantedTypes((params as { events?: unknown } | undefined)?.events);
        return wanted === null || wanted.has(event.type) ? [event] : [];
      }
      return event.type === spec.type ? [event] : [];
    },
  };
}
