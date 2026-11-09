import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { CalClient } from "./client.ts";

/**
 * Cal.com webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` registers a webhook for one trigger event (`POST /v2/webhooks`) with a random
 *     per-subscription `secret` (D5 (1)) kept in subscription state.
 *   - `onUnsubscribe` deletes it; one Cal.com no longer has counts as deleted.
 *   - `handleIngest` verifies `X-Cal-Signature-256` (hex HMAC-SHA256 of the exact request body
 *     under the secret) BEFORE it parses anything. Cal.com's signature carries no timestamp, so
 *     there is no replay window to enforce.
 *
 * Docs (verified 2026-11-09):
 *   https://cal.com/docs/developing/guides/automation/webhooks
 *   https://cal.com/docs/api-reference/v2/webhooks/create-a-webhook
 */

export type CalTrigger = "BOOKING_CREATED" | "BOOKING_CANCELLED" | "BOOKING_RESCHEDULED";

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  triggerEvent: CalTrigger;
  secret: string;
}

/** The run's `trigger.event`: one booking event. */
export interface BookingEvent {
  triggerEvent: string;
  createdAt: string | null;
  bookingUid: string | null;
  bookingId: string | null;
  title: string | null;
  eventType: string | null;
  startTime: string | null;
  endTime: string | null;
  status: string | null;
  organizer: Record<string, unknown> | null;
  attendees: unknown[];
  location: string | null;
  responses: Record<string, unknown> | null;
  cancellationReason: string | null;
  rescheduleUid: string | null;
  payload: Record<string, unknown>;
}

const OUTPUT: OutputField[] = [
  { key: "triggerEvent", type: "string", label: "Trigger Event" },
  { key: "createdAt", type: "string", label: "Created At" },
  { key: "bookingUid", type: "string", label: "Booking UID" },
  { key: "bookingId", type: "string", label: "Booking ID" },
  { key: "title", type: "string", label: "Title" },
  { key: "eventType", type: "string", label: "Event Type" },
  { key: "startTime", type: "string", label: "Start Time" },
  { key: "endTime", type: "string", label: "End Time" },
  { key: "status", type: "string", label: "Status" },
  { key: "organizer", type: "object", label: "Organizer" },
  { key: "attendees", type: "array", label: "Attendees" },
  { key: "location", type: "string", label: "Location" },
  { key: "responses", type: "object", label: "Booking Form Responses" },
  { key: "cancellationReason", type: "string", label: "Cancellation Reason" },
  { key: "rescheduleUid", type: "string", label: "Reschedule UID" },
  { key: "payload", type: "object", label: "Full Payload" },
];

function sampleFor(triggerEvent: CalTrigger): BookingEvent {
  return {
    triggerEvent,
    createdAt: "2026-11-09T10:00:00.000Z",
    bookingUid: "bk_9Xq2",
    bookingId: "1234",
    title: "30 min between Ada and Grace",
    eventType: "30min",
    startTime: "2026-11-12T15:00:00Z",
    endTime: "2026-11-12T15:30:00Z",
    status: triggerEvent === "BOOKING_CANCELLED" ? "CANCELLED" : "ACCEPTED",
    organizer: { name: "Ada", email: "ada@example.com", timeZone: "Europe/London" },
    attendees: [{ name: "Grace", email: "grace@example.com", timeZone: "America/New_York" }],
    location: "integrations:daily",
    responses: { name: { value: "Grace" } },
    cancellationReason: triggerEvent === "BOOKING_CANCELLED" ? "Conflict" : null,
    rescheduleUid: null,
    payload: {},
  };
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** The delivery body → its event. Throws on a body that is not a Cal.com delivery. */
export function normalizeDelivery(body: unknown): BookingEvent {
  const delivery = asObject(body);
  const triggerEvent = str(delivery?.triggerEvent);
  const payload = asObject(delivery?.payload);
  if (!delivery || !triggerEvent || !payload) {
    throw new Error("Not a Cal.com webhook delivery: expected `triggerEvent` and `payload`.");
  }
  return {
    triggerEvent,
    createdAt: str(delivery.createdAt),
    bookingUid: str(payload.uid),
    bookingId: str(payload.bookingId),
    title: str(payload.title),
    eventType: str(payload.type),
    startTime: str(payload.startTime),
    endTime: str(payload.endTime),
    status: str(payload.status),
    organizer: asObject(payload.organizer),
    attendees: Array.isArray(payload.attendees) ? payload.attendees : [],
    location: str(payload.location),
    responses: asObject(payload.responses),
    cancellationReason: str(payload.cancellationReason),
    rescheduleUid: str(payload.rescheduleUid),
    payload,
  };
}

/**
 * Verify `X-Cal-Signature-256` over the exact bytes received and return them. Throws (never
 * echoing the secret, the signature or the header) on failure; an unset secret is refused before
 * any compare.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
): Promise<string> {
  const body = requireRawBody(raw);
  const key = requireSecret(secret);
  const given = header(raw, "x-cal-signature-256");
  if (given === undefined || given === "") {
    throw new Error("Cal.com delivery refused: the X-Cal-Signature-256 header is missing.");
  }
  const expected = await hmac("SHA-256", key, body, "hex");
  if (!timingSafeEqual(expected, given.trim().toLowerCase())) {
    throw new Error("Cal.com delivery refused: the signature does not match.");
  }
  return body;
}

/** True for the "no such webhook" answers `CalClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^Cal\.com (404|410)\b/.test(err.message);
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  triggerEvent: CalTrigger;
}

/** Build one Cal.com webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<Record<string, never>, BookingEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [],
    output: OUTPUT,
    sample: sampleFor(spec.triggerEvent),

    async onSubscribe({ callbackUrl }, ctx: HookContext) {
      const secret = randomSecret();
      const created = await new CalClient(ctx).request<{ data?: { id?: unknown } }>("/webhooks", {
        method: "POST",
        body: {
          subscriberUrl: callbackUrl,
          triggers: [spec.triggerEvent],
          active: true,
          secret,
        },
      });
      const webhookId = str(created?.data?.id);
      if (!webhookId) throw new Error("Cal.com created the webhook but returned no id.");
      return { webhookId, triggerEvent: spec.triggerEvent, secret };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const id = str((state as Partial<TriggerState> | undefined)?.webhookId);
      if (!id) return;
      try {
        await new CalClient(ctx).request(`/webhooks/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Cal.com delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, state?.secret);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Cal.com delivery refused: the body is not JSON.");
      }
      const event = normalizeDelivery(parsed);
      if (event.triggerEvent !== spec.triggerEvent) return [];
      return [event];
    },
  };
}
