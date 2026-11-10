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
 * Zoom event-subscription triggers (rfcs/trigger.md, manual-webhook form). Vendor docs, verified
 * 2026-11-10: https://developers.zoom.us/docs/api/webhooks/ (signature, URL validation, retries),
 * https://developers.zoom.us/docs/api/meetings/events/ and
 * https://developers.zoom.us/docs/api/users/events/ (event catalog).
 *
 * Zoom event subscriptions are configured on the Marketplace app (Feature, Event Subscriptions),
 * not through the REST API this app calls, so the trigger is a manual webhook:
 *   - `onSubscribe` makes no Zoom call and returns the `callbackUrl` to paste as the Event
 *     Notification Endpoint URL;
 *   - the app's Secret Token is a secret param (D5 (2));
 *   - `handleIngest` verifies `x-zm-signature` = `v0=` + hex HMAC-SHA256, keyed by the Secret
 *     Token, of `v0:<x-zm-request-timestamp>:<raw body>`, over the raw bytes, BEFORE parsing. Zoom
 *     publishes no timestamp window, so the 5-minute default of the webhook kit applies.
 *   - the `endpoint.url_validation` handshake is answered with `{plainToken, encryptedToken}`
 *     (hex HMAC-SHA256 of the token under the Secret Token) ONLY after the same signature check
 *     and only for a plain base64url token, so the endpoint can never be used to sign a message
 *     of an attacker's choosing.
 */

export const TOLERANCE_SEC = 300;

export interface TriggerParams {
  secretToken?: string;
  /** Any Event only: comma-separated Zoom event names, empty = every event. */
  events?: string;
}

export interface TriggerState {
  callbackUrl: string;
}

/** The run's `trigger.event`: the delivery with its payload lifted out. */
export interface ZoomEvent {
  event: string;
  eventTs: number | null;
  accountId: string | null;
  object: Record<string, unknown>;
  oldObject: Record<string, unknown> | null;
}

const SECRET_PARAM: Param = {
  key: "secretToken",
  label: "Secret Token",
  type: "secret",
  required: true,
  hint:
    "Zoom Marketplace, your app, Features, Secret Token. Zoom signs every event with it; a request that does not verify is refused.",
};

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Event names",
  type: "string",
  placeholder: "meeting.started, recording.completed",
  hint: "Comma-separated Zoom event names to react to. Leave empty for every event Zoom sends.",
};

const OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event name" },
  { key: "eventTs", type: "number", label: "Event time (ms)" },
  { key: "accountId", type: "string", label: "Account ID" },
  { key: "object", type: "object", label: "Object (payload.object)" },
  { key: "oldObject", type: "object", label: "Previous values (payload.old_object)" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

/** Comma-separated event names, trimmed and de-duplicated. */
export function parseEventList(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter((s) => s !== ""))];
}

/** The signature Zoom would send for this delivery. */
async function expectedSignature(secret: string, timestamp: string, body: string) {
  return "v0=" + await hmac("SHA-256", secret, `v0:${timestamp}:${body}`, "hex");
}

/** Throws unless the delivery carries a valid, fresh Zoom signature; returns the parsed body. */
async function verifiedBody(
  raw: { method: string; rawBody?: unknown; headers: Record<string, string> },
  secretToken: unknown,
): Promise<{ body: Record<string, unknown>; secret: string }> {
  const secret = requireSecret(secretToken);
  const text = requireRawBody(raw);
  if (raw.method.toUpperCase() !== "POST") {
    throw new Error("Zoom delivers events with POST only.");
  }
  const given = header(raw, "x-zm-signature");
  const stamp = header(raw, "x-zm-request-timestamp");
  if (!given) throw new Error("Zoom delivery refused: the x-zm-signature header is missing.");
  if (!stamp || !/^\d{1,15}$/.test(stamp)) {
    throw new Error("Zoom delivery refused: the x-zm-request-timestamp header is missing.");
  }
  if (!timingSafeEqual(await expectedSignature(secret, stamp, text), given)) {
    throw new Error("Zoom delivery refused: the signature does not match.");
  }
  if (!withinTolerance(Number(stamp), Date.now(), TOLERANCE_SEC)) {
    throw new Error("Zoom delivery refused: the signed timestamp is outside the tolerance.");
  }
  let body: Record<string, unknown> | null;
  try {
    body = asObject(JSON.parse(text));
  } catch {
    body = null;
  }
  if (!body || typeof body.event !== "string" || body.event === "") {
    throw new Error("Not a Zoom event: expected a JSON object with an event name.");
  }
  return { body, secret };
}

export function normalizeEvent(body: Record<string, unknown>): ZoomEvent {
  const payload = asObject(body.payload);
  return {
    event: String(body.event),
    eventTs: typeof body.event_ts === "number" ? body.event_ts : null,
    accountId: typeof payload?.account_id === "string" ? payload.account_id : null,
    object: asObject(payload?.object) ?? {},
    oldObject: asObject(payload?.old_object),
  };
}

export interface ZoomTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The Zoom event this trigger fires on; omitted for Any Event (its `events` param). */
  event?: string;
  /** A representative `payload.object` for the sample. */
  sampleObject?: Record<string, unknown>;
}

/** Build one Zoom event trigger. */
export function zoomTrigger(
  spec: ZoomTriggerSpec,
): TriggerDefinition<TriggerParams, ZoomEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.event ? [SECRET_PARAM] : [SECRET_PARAM, EVENTS_PARAM],
    output: OUTPUT,
    sample: {
      event: spec.event ?? "meeting.started",
      eventTs: 1794346800000,
      accountId: "sample-account-id",
      object: spec.sampleObject ?? {
        id: "1234567890",
        uuid: "sample-meeting-uuid",
        host_id: "sample-host-id",
        topic: "Weekly sync",
        type: 2,
        start_time: "2026-11-09T09:00:00Z",
        timezone: "UTC",
      },
      oldObject: null,
    } satisfies ZoomEvent,

    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params }) {
      const { body, secret } = await verifiedBody(raw, params?.secretToken);
      if (body.event === "endpoint.url_validation") {
        const token = asObject(body.payload)?.plainToken;
        if (typeof token !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(token)) {
          throw new Error("Zoom URL validation refused: the plainToken is not a plain token.");
        }
        return {
          events: [],
          response: {
            status: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              plainToken: token,
              encryptedToken: await hmac("SHA-256", secret, token, "hex"),
            }),
          },
        };
      }
      const wanted = spec.event ? [spec.event] : parseEventList(params?.events);
      if (wanted.length > 0 && !wanted.includes(String(body.event))) return [];
      return [normalizeEvent(body)];
    },
  };
}
