import type { OutputField, TriggerDefinition } from "@w6w/types";

/**
 * tl;dv webhook triggers (rfcs/trigger.md, webhook form, manual receiver, UNSIGNED).
 *
 *   - tl;dv webhooks are set up in tl;dv itself (per user, team or organization), not through the
 *     public API, so `onSubscribe` makes no tl;dv call: it hands back the `callbackUrl` the user
 *     pastes there, and `onUnsubscribe` is a no-op.
 *   - `handleIngest` has nothing to verify: tl;dv's webhook documentation describes no signature,
 *     secret or signing header, so none is invented. The delivery is a JSON POST
 *     `{ id, event, data, executedAt }`; the trigger checks the method and the shape, and emits it
 *     only for the event it was built for (tl;dv may send both events to one URL).
 *
 * Trust model: the callback URL is the secret. The host issues it per subscription as a long
 * unguessable id; anyone who learns it can post a forged delivery to it. tl;dv waits at most ten
 * seconds for a 2xx and then retries.
 *
 * Docs (verified 2026-11-10): https://doc.tldv.io/index.html (Webhook Feature, Webhooks)
 */

/** The events tl;dv documents. */
export type TldvEventName = "MeetingReady" | "TranscriptReady";

/** The run's `trigger.event`: one tl;dv delivery. */
export interface TldvEvent {
  deliveryId: string | null;
  event: TldvEventName;
  executedAt: string | null;
  meetingId: string | null;
  /** MeetingReady: meeting name. */
  name: string | null;
  happenedAt: string | null;
  url: string | null;
  duration: number | null;
  organizer: Record<string, unknown> | null;
  invitees: unknown[];
  /** MeetingReady: the embedded transcript object when the subscription includes it, else null. TranscriptReady: the plain transcript text. */
  transcript: unknown;
  /** TranscriptReady: the timed segments. */
  segments: unknown[];
  /** MeetingReady: `notes` when the payload carries them. */
  notes: unknown;
  metadata: Record<string, unknown> | null;
  /** The payload's own `data` object, untouched. */
  data: Record<string, unknown>;
}

const OUTPUT: OutputField[] = [
  { key: "deliveryId", type: "string", label: "Delivery ID" },
  { key: "event", type: "string", label: "Event (MeetingReady or TranscriptReady)" },
  { key: "executedAt", type: "string", label: "Executed at" },
  { key: "meetingId", type: "string", label: "Meeting ID" },
  { key: "name", type: "string", label: "Meeting name" },
  { key: "happenedAt", type: "string", label: "Meeting date" },
  { key: "url", type: "string", label: "Meeting URL" },
  { key: "duration", type: "number", label: "Duration (seconds)" },
  { key: "organizer", type: "object", label: "Organizer" },
  { key: "invitees", type: "array", label: "Invitees" },
  { key: "transcript", type: "object", label: "Transcript" },
  { key: "segments", type: "array", label: "Transcript segments" },
  { key: "notes", type: "object", label: "AI notes" },
  { key: "metadata", type: "object", label: "Metadata sent with the import" },
  { key: "data", type: "object", label: "Full Payload Data" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

/** The delivery body → its object. tl;dv webhooks always POST JSON. */
function parseDelivery(raw: { body: unknown }): Record<string, unknown> {
  let body = raw.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch { /* falls through to the refusal below */ }
  }
  const obj = asObject(body);
  if (!obj) throw new Error("tl;dv delivery refused: the body is not a JSON object.");
  return obj;
}

/** One delivery → its event, or null when it is a different tl;dv event. */
export function normalizeDelivery(
  body: Record<string, unknown>,
  want: TldvEventName,
): TldvEvent | null {
  const event = str(body.event);
  const data = asObject(body.data);
  if (!event || !data) {
    throw new Error("Not a tl;dv webhook delivery: expected an event and its data.");
  }
  if (event !== want) return null;
  const inner = asObject(data.data);
  return {
    deliveryId: str(body.id),
    event: want,
    executedAt: str(body.executedAt),
    meetingId: want === "TranscriptReady" ? str(data.meetingId) ?? str(data.id) : str(data.id),
    name: str(data.name),
    happenedAt: str(data.happenedAt),
    url: str(data.url),
    duration: typeof data.duration === "number" ? data.duration : null,
    organizer: asObject(data.organizer),
    invitees: Array.isArray(data.invitees) ? data.invitees : [],
    transcript: want === "TranscriptReady" ? inner?.transcript ?? null : data.transcript ?? null,
    segments: want === "TranscriptReady" && Array.isArray(inner?.segments) ? inner.segments : [],
    notes: data.notes ?? null,
    metadata: asObject(data.metadata),
    data,
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  event: TldvEventName;
  sample: TldvEvent;
}

/** Build one tl;dv webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<Record<string, never>, TldvEvent, { callbackUrl: string }> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    output: OUTPUT,
    sample: spec.sample,

    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    handleIngest({ raw }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`tl;dv delivers webhooks with POST, not ${raw.method}.`);
      }
      const event = normalizeDelivery(parseDelivery(raw), spec.event);
      // The other tl;dv event (one URL may receive both) is acknowledged without a run.
      return event ? [event] : [];
    },
  };
}
