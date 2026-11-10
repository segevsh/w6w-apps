import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";

/**
 * Facebook Messenger webhook triggers (rfcs/trigger.md, webhook form, manual setup, signed).
 *
 * Meta has no per-trigger registration call the Page token can make (subscribing a webhook to an app
 * takes an app access token), so the callback URL, the verify token and the subscribed fields are set
 * once in the App Dashboard (Webhooks, "Page"). Two checks then protect the endpoint:
 *
 *   - Verification request (GET): `hub.mode=subscribe`, `hub.verify_token`, `hub.challenge`. The
 *     handler compares `hub.verify_token` with the `verifyToken` param (constant time, after
 *     `requireSecret`) and only then answers `{ events: [], response }` with the challenge as a plain
 *     text body (rfcs/trigger.md, D8 seam).
 *   - Event notification (POST): `X-Hub-Signature-256: sha256=<hex>`, the HMAC-SHA256 of the body
 *     under the app's App Secret (D5 (2): pasted as `appSecret`). Meta signs an escaped-unicode
 *     serialisation, so the exact received text is what is verified, never a re-serialised body.
 *     Verified BEFORE the body is parsed.
 *
 * Trust model: the signature binds the body, so tampered data is refused; Meta's scheme carries no
 * timestamp, so an identical delivery replayed later is not detected. De-duplicate on the message id
 * (Meta itself retries a failed delivery several times).
 *
 * Docs (verified 2026-11-10):
 * https://developers.facebook.com/documentation/business-messaging/messenger-platform/webhooks and its
 * event pages /webhook-events/messages, /messaging_postbacks and /message-deliveries
 */

export interface TriggerParams {
  appSecret?: string;
  verifyToken?: string;
  kinds?: string;
}

export type MessengerKind = "message" | "postback" | "delivery";

/** The run's `trigger.event`: one Messenger event. */
export interface MessengerEvent {
  kind: MessengerKind;
  pageId: string | null;
  senderId: string | null;
  recipientId: string | null;
  timestamp: number | null;
  messageId: string | null;
  text: string | null;
  attachments: unknown[];
  quickReplyPayload: string | null;
  postbackTitle: string | null;
  postbackPayload: string | null;
  referral: Record<string, unknown> | null;
  deliveredMessageIds: string[];
  watermark: number | null;
  data: Record<string, unknown>;
}

const APP_SECRET_PARAM: Param = {
  key: "appSecret",
  label: "App Secret",
  type: "secret",
  required: true,
  hint:
    "Your Meta app's App Secret (App Dashboard, App settings, Basic). Meta signs every notification with it; a notification that does not verify is refused.",
};

const VERIFY_TOKEN_PARAM: Param = {
  key: "verifyToken",
  label: "Verify token",
  type: "secret",
  required: true,
  hint:
    "A string you choose and also enter in the App Dashboard's Webhooks 'Verify token' field. Meta sends it back when you save the callback URL; a request with another token is refused.",
};

const COMMON_OUTPUT: OutputField[] = [
  { key: "pageId", type: "string", label: "Page ID" },
  { key: "senderId", type: "string", label: "Sender (page-scoped) ID" },
  { key: "recipientId", type: "string", label: "Recipient ID" },
  { key: "timestamp", type: "number", label: "Timestamp (epoch milliseconds)" },
  { key: "data", type: "object", label: "Full event data" },
];

export const OUTPUT: OutputField[] = [
  { key: "kind", type: "string", label: "Kind (message, postback or delivery)" },
  ...COMMON_OUTPUT,
  { key: "messageId", type: "string", label: "Message ID" },
  { key: "text", type: "string", label: "Text (messages)" },
  { key: "attachments", type: "array", label: "Attachments (messages)" },
  { key: "quickReplyPayload", type: "string", label: "Quick reply payload (messages)" },
  { key: "postbackTitle", type: "string", label: "Button title (postbacks)" },
  { key: "postbackPayload", type: "string", label: "Button payload (postbacks)" },
  { key: "referral", type: "object", label: "Referral (postbacks)" },
  { key: "deliveredMessageIds", type: "array", label: "Delivered message IDs (deliveries)" },
  { key: "watermark", type: "number", label: "Watermark, epoch milliseconds (deliveries)" },
];

const KINDS: MessengerKind[] = ["message", "postback", "delivery"];

const KINDS_PARAM: Param = {
  key: "kinds",
  label: "Event kinds",
  type: "string",
  advanced: true,
  hint: `Comma-separated kinds to fire on: ${KINDS.join(", ")}. Leave empty for all of them.`,
};

/** The user's kind list (default all) → validated kinds. */
export function chooseKinds(raw: string | undefined): MessengerKind[] {
  const wanted = (raw ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (wanted.length === 0) return KINDS;
  const bad = wanted.filter((k) => !KINDS.includes(k as MessengerKind));
  if (bad.length > 0) {
    throw new Error(`Unknown event kind(s): ${bad.join(", ")}. Use ${KINDS.join(", ")}.`);
  }
  return [...new Set(wanted)] as MessengerKind[];
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

/**
 * The verification request (GET). Throws (never echoing the token) unless the mode is `subscribe`
 * and the verify token matches; returns the challenge to echo.
 */
export function verifyChallenge(query: Record<string, string>, verifyToken: unknown): string {
  const expected = requireSecret(verifyToken);
  const sent = query["hub.verify_token"];
  if (query["hub.mode"] !== "subscribe" || typeof sent !== "string" || sent === "") {
    throw new Error("Messenger verification refused: not a subscribe request with a token.");
  }
  if (!timingSafeEqual(sent, expected)) {
    throw new Error("Messenger verification refused: the verify token does not match.");
  }
  const challenge = query["hub.challenge"];
  if (typeof challenge !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(challenge)) {
    throw new Error("Messenger verification refused: the challenge is missing or malformed.");
  }
  return challenge;
}

/**
 * Verify `X-Hub-Signature-256` against the App Secret over the exact received text and return the
 * parsed notification. Throws (never echoing the secret, the signature or the body) unless it
 * verifies; an unset secret is refused before any compare.
 */
export async function verifyDelivery(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  appSecret: unknown,
): Promise<Record<string, unknown>> {
  const secret = requireSecret(appSecret);
  const body = requireRawBody(raw);
  const sent = header(raw, "x-hub-signature-256");
  const m = sent ? /^sha256=([0-9a-fA-F]{64})$/.exec(sent.trim()) : null;
  if (!m) {
    throw new Error("Messenger delivery refused: the signature header is missing or malformed.");
  }
  const expected = await hmac("SHA-256", secret, body, "hex");
  if (!timingSafeEqual(expected, m[1].toLowerCase())) {
    throw new Error("Messenger delivery refused: the signature does not match.");
  }
  let parsed: Record<string, unknown> | null;
  try {
    parsed = asObject(JSON.parse(body));
  } catch {
    parsed = null;
  }
  if (!parsed || parsed.object !== "page" || !Array.isArray(parsed.entry)) {
    throw new Error("Not a Messenger webhook delivery: expected a page notification.");
  }
  return parsed;
}

/** Every messaging item of a verified notification of the wanted kinds, flattened to events. */
export function eventsOf(
  notification: Record<string, unknown>,
  kinds: MessengerKind[],
): MessengerEvent[] {
  const out: MessengerEvent[] = [];
  for (const entry of notification.entry as unknown[]) {
    const e = asObject(entry);
    for (const item of Array.isArray(e?.messaging) ? e.messaging : []) {
      const d = asObject(item);
      if (!d) continue;
      const message = asObject(d.message);
      const postback = asObject(d.postback);
      const delivery = asObject(d.delivery);
      const itemKind: MessengerKind | null = postback
        ? "postback"
        : delivery
        ? "delivery"
        : message && message.is_echo !== true
        ? "message"
        : null; // echoes of the page's own sends, reads, reactions ... are other fields
      if (itemKind === null || !kinds.includes(itemKind)) continue;
      const mids = Array.isArray(delivery?.mids)
        ? delivery.mids.map(str).filter((s) => s !== null)
        : [];
      out.push({
        kind: itemKind,
        pageId: str(e?.id),
        senderId: str(asObject(d.sender)?.id),
        recipientId: str(asObject(d.recipient)?.id),
        timestamp: num(d.timestamp),
        messageId: str(message?.mid) ?? str(postback?.mid),
        text: str(message?.text),
        attachments: Array.isArray(message?.attachments) ? message.attachments : [],
        quickReplyPayload: str(asObject(message?.quick_reply)?.payload),
        postbackTitle: str(postback?.title),
        postbackPayload: str(postback?.payload),
        referral: asObject(postback?.referral),
        deliveredMessageIds: mids as string[],
        watermark: num(delivery?.watermark),
        data: d,
      });
    }
  }
  return out;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  sample: MessengerEvent;
}

/** Build one Messenger webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, MessengerEvent, { callbackUrl: string }> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [APP_SECRET_PARAM, VERIFY_TOKEN_PARAM, KINDS_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    // Manual webhook: the callback URL is entered in the Meta App Dashboard; nothing to register.
    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },
    onUnsubscribe() {},

    async handleIngest({ raw, params }) {
      const method = raw.method.toUpperCase();
      if (method === "GET") {
        const challenge = verifyChallenge(raw.query, params?.verifyToken);
        return {
          events: [],
          response: {
            status: 200,
            headers: { "content-type": "text/plain" },
            body: challenge,
          },
        };
      }
      if (method !== "POST") {
        throw new Error(
          `Meta delivers webhooks with POST (verification with GET), not ${raw.method}.`,
        );
      }
      const notification = await verifyDelivery(raw, params?.appSecret);
      return eventsOf(notification, chooseKinds(params?.kinds));
    },
  };
}
