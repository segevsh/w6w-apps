import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";

/**
 * LINE Messaging API webhook triggers (rfcs/trigger.md, webhook form, manual receiver).
 *
 *   - The webhook URL is set per channel in the LINE Developers Console (Messaging API tab), so
 *     `onSubscribe` makes no LINE call: it hands back the `callbackUrl` the user pastes there and
 *     `onUnsubscribe` is a no-op.
 *   - `handleIngest` verifies `x-line-signature` (base64 HMAC-SHA256 of the exact request body under
 *     the channel secret, D5 (2)) BEFORE it parses anything. LINE documents no timestamp in the
 *     signature scheme and redelivers failed webhooks, so there is no freshness window; each event
 *     carries `webhookEventId` and `isRedelivery` so a workflow can de-duplicate.
 *   - LINE takes ONE webhook URL per channel, so one trigger carries every event type a workflow
 *     wants (`eventTypes`, default message, follow, unfollow, postback); each matching event in a
 *     delivery becomes one run. The Console's "Verify" button posts an empty `events` array:
 *     acknowledged, no run.
 *
 * Docs (verified 2026-11-10): https://developers.line.biz/en/docs/messaging-api/verify-webhook-signature/
 * and https://developers.line.biz/en/docs/messaging-api/receiving-messages/
 */

export interface TriggerParams {
  signingSecret?: string;
  eventTypes?: string;
}

export const DEFAULT_EVENT_TYPES = ["message", "follow", "unfollow", "postback"];

const EVENT_TYPES_PARAM: Param = {
  key: "eventTypes",
  label: "Event types",
  type: "string",
  advanced: true,
  hint:
    "Comma-separated LINE webhook event types to start a run for (message, follow, unfollow, postback, join, leave, memberJoined, memberLeft, unsend, videoPlayComplete, beacon, accountLink). Leave empty for message, follow, unfollow and postback.",
};

/** The `eventTypes` param → the list to match (default four). Throws on a malformed name. */
export function chooseEventTypes(raw: string | undefined): string[] {
  const wanted = (raw ?? "").split(",").map((e) => e.trim()).filter((e) => e !== "");
  if (wanted.length === 0) return DEFAULT_EVENT_TYPES;
  if (wanted.some((e) => !/^[A-Za-z]{1,40}$/.test(e))) {
    throw new Error("Event types must be LINE event type names such as message or follow.");
  }
  return [...new Set(wanted)];
}

/** The run's `trigger.event`: one LINE webhook event object, flattened. */
export interface LineEvent {
  type: string;
  webhookEventId: string | null;
  timestamp: number | null;
  destination: string | null;
  mode: string | null;
  isRedelivery: boolean;
  replyToken: string | null;
  sourceType: string | null;
  userId: string | null;
  groupId: string | null;
  roomId: string | null;
  message: Record<string, unknown> | null;
  postback: Record<string, unknown> | null;
  event: Record<string, unknown>;
}

const SIGNING_SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "Channel Secret",
  type: "secret",
  required: true,
  hint:
    "LINE Developers Console, your channel, Basic settings, Channel secret. LINE signs every delivery with it; a delivery that does not verify is refused.",
};

export const OUTPUT: OutputField[] = [
  { key: "type", type: "string", label: "Event type" },
  { key: "webhookEventId", type: "string", label: "Webhook event ID (de-duplicate on this)" },
  { key: "timestamp", type: "number", label: "Event time (epoch milliseconds)" },
  { key: "destination", type: "string", label: "Bot user ID the event was sent to" },
  { key: "mode", type: "string", label: "Channel state (active or standby)" },
  { key: "isRedelivery", type: "boolean", label: "Redelivery of an earlier webhook" },
  { key: "replyToken", type: "string", label: "Reply token (for Reply Message)" },
  { key: "sourceType", type: "string", label: "Source type (user, group, room)" },
  { key: "userId", type: "string", label: "User ID" },
  { key: "groupId", type: "string", label: "Group ID" },
  { key: "roomId", type: "string", label: "Room ID" },
  { key: "message", type: "object", label: "Message object (message events)" },
  { key: "postback", type: "object", label: "Postback object (postback events)" },
  { key: "event", type: "object", label: "Full webhook event object" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

/**
 * Check `x-line-signature` against the exact bytes received. Throws (never echoing the secret, the
 * signature or the header) unless it matches; an unset secret is refused before any compare.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const given = header(raw, "x-line-signature");
  if (given === undefined || given === "") {
    throw new Error("LINE delivery refused: the x-line-signature header is missing.");
  }
  const expected = await hmac("SHA-256", key, body, "base64");
  if (!timingSafeEqual(expected, given)) {
    throw new Error("LINE delivery refused: the signature does not match.");
  }
  return body;
}

/** One webhook event object (plus the delivery's `destination`) → the run's event. */
export function normalizeEvent(ev: Record<string, unknown>, destination: string | null): LineEvent {
  const source = asObject(ev.source);
  const ctx = asObject(ev.deliveryContext);
  return {
    type: str(ev.type) ?? "unknown",
    webhookEventId: str(ev.webhookEventId),
    timestamp: typeof ev.timestamp === "number" ? ev.timestamp : null,
    destination,
    mode: str(ev.mode),
    isRedelivery: ctx?.isRedelivery === true,
    replyToken: str(ev.replyToken),
    sourceType: str(source?.type),
    userId: str(source?.userId),
    groupId: str(source?.groupId),
    roomId: str(source?.roomId),
    message: asObject(ev.message),
    postback: asObject(ev.postback),
    event: ev,
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  sample: LineEvent;
}

/** Build the LINE event webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, LineEvent, { callbackUrl: string }> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [SIGNING_SECRET_PARAM, EVENT_TYPES_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`LINE delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, params?.signingSecret);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("LINE delivery refused: the body is not JSON.");
      }
      const obj = asObject(parsed);
      if (!obj || !Array.isArray(obj.events)) {
        throw new Error("Not a LINE webhook delivery: expected an `events` array.");
      }
      const wanted = chooseEventTypes(params?.eventTypes);
      const destination = str(obj.destination);
      const out: LineEvent[] = [];
      for (const item of obj.events) {
        const ev = asObject(item);
        if (ev && typeof ev.type === "string" && wanted.includes(ev.type)) {
          out.push(normalizeEvent(ev, destination));
        }
      }
      return out;
    },
  };
}
