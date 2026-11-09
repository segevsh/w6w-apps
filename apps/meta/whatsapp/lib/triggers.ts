/**
 * whatsapp webhook triggers (manual webhook). Meta signs every delivery with the app secret
 * (X-Hub-Signature-256 = sha256 HMAC over the exact body bytes) and confirms a subscription with a
 * one-time GET carrying hub.verify_token and hub.challenge. Docs, verified 2026-11-09:
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */
import type {
  IngestResponse,
  OutputField,
  Param,
  TriggerCall,
  TriggerDefinition,
} from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";

/** What `onSubscribe` returns and the host persists: Meta is registered by hand in the dashboard. */
export interface TriggerState {
  callbackUrl: string;
}

export interface MetaParams {
  /** The Meta app's App Secret — signs every delivery. */
  appSecret?: string;
  /** The verify token the user typed into the dashboard — answers the one-time GET handshake. */
  verifyToken?: string;
}

export const APP_SECRET_PARAM: Param = {
  key: "appSecret",
  label: "App Secret",
  type: "secret",
  required: true,
  hint:
    "Meta app dashboard → App settings → Basic → App Secret. Every delivery is verified against it; deliveries that do not match are refused.",
};

export const VERIFY_TOKEN_PARAM: Param = {
  key: "verifyToken",
  label: "Verify Token",
  type: "secret",
  required: true,
  hint:
    "Any string you choose. Enter the same value in the webhook's Verify Token field in the Meta dashboard; it answers Meta's one-time subscription check.",
};

export const META_PARAMS: Param[] = [APP_SECRET_PARAM, VERIFY_TOKEN_PARAM];

/** A Meta challenge is a number; accept only a short token of URL-safe characters. */
const CHALLENGE = /^[A-Za-z0-9_-]{1,256}$/;

/**
 * Meta's subscription handshake: `GET ?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…`
 * must be answered with the challenge, and only when the verify token is the one we hold.
 */
function answerChallenge(
  raw: TriggerCall,
  params: MetaParams,
): { events: never[]; response: IngestResponse } {
  const expected = requireSecret(params.verifyToken);
  const q = raw.query ?? {};
  if ((q["hub.mode"] ?? q["hub_mode"]) !== "subscribe") {
    throw new Error("Meta webhook GET refused: not a subscription check.");
  }
  const given = q["hub.verify_token"] ?? q["hub_verify_token"];
  if (!timingSafeEqual(typeof given === "string" ? given : "", expected)) {
    throw new Error("Meta webhook verification refused: the verify token does not match.");
  }
  const challenge = q["hub.challenge"] ?? q["hub_challenge"];
  if (typeof challenge !== "string" || !CHALLENGE.test(challenge)) {
    throw new Error("Meta webhook verification refused: the challenge is missing or malformed.");
  }
  return { events: [], response: { body: challenge } };
}

/** `X-Hub-Signature-256: sha256=<hex HMAC-SHA256(app secret, exact body bytes)>`. */
async function verifySignature(raw: TriggerCall, params: MetaParams): Promise<string> {
  const secret = requireSecret(params.appSecret);
  const body = requireRawBody(raw);
  const given = header(raw, "x-hub-signature-256");
  if (typeof given !== "string" || !given.startsWith("sha256=")) {
    throw new Error("Meta webhook refused: the X-Hub-Signature-256 header is missing.");
  }
  const expected = "sha256=" + await hmac("SHA-256", secret, body, "hex");
  if (!timingSafeEqual(given.toLowerCase(), expected)) {
    throw new Error("Meta webhook refused: the signature does not match.");
  }
  return body;
}

export interface MetaEntry {
  id?: string;
  time?: number;
  changes?: Array<{ field?: string; value?: Record<string, unknown> }>;
}

export interface MetaPayload {
  object?: string;
  entry?: MetaEntry[];
}

/**
 * Shared ingest: answer the GET handshake, or verify the signature over the raw body and hand the
 * parsed payload to `extract`. Verification happens before the body is parsed.
 */
export async function ingestMeta<E>(
  raw: TriggerCall,
  params: MetaParams,
  extract: (payload: MetaPayload) => E[],
): Promise<E[] | { events: E[]; response: IngestResponse }> {
  const method = String(raw.method ?? "").toUpperCase();
  if (method === "GET") return answerChallenge(raw, params);
  if (method !== "POST") throw new Error(`Meta delivers webhooks with POST, not ${raw.method}.`);
  const body = await verifySignature(raw, params);
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error("Meta webhook refused: the body is not JSON.");
  }
  if (payload === null || typeof payload !== "object") return [];
  return extract(payload as MetaPayload);
}

export function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

export function obj(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

export interface MessageEvent {
  messageId: string | null;
  from: string | null;
  contactName: string | null;
  timestamp: number | null;
  type: string | null;
  text: string | null;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  message: Record<string, unknown>;
}

export interface StatusEvent {
  messageId: string | null;
  status: string | null;
  recipientId: string | null;
  timestamp: number | null;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  errors: unknown[];
}

const MESSAGE_OUTPUT: OutputField[] = [
  { key: "messageId", type: "string", label: "Message ID" },
  { key: "from", type: "string", label: "Sender (WhatsApp ID)" },
  { key: "contactName", type: "string", label: "Sender Profile Name" },
  { key: "timestamp", type: "number", label: "Timestamp (epoch seconds)" },
  { key: "type", type: "string", label: "Message Type (text, image, button…)" },
  { key: "text", type: "string", label: "Text Body" },
  { key: "phoneNumberId", type: "string", label: "Business Phone Number ID" },
  { key: "displayPhoneNumber", type: "string", label: "Business Phone Number" },
  { key: "message", type: "object", label: "Raw Message" },
];

const MESSAGE_SAMPLE: MessageEvent = {
  messageId: "wamid.HBgLMTY1MDM4Nzk0MzkVAgASGBQzQUZCMTY0MDc2MUYwNzBDNTY5MAA=",
  from: "16505551234",
  contactName: "Alex Example",
  timestamp: 1731139200,
  type: "text",
  text: "Hello!",
  phoneNumberId: "106540352242922",
  displayPhoneNumber: "15551234567",
  message: {
    from: "16505551234",
    id: "wamid.HBgLMTY1MDM4Nzk0MzkVAgASGBQzQUZCMTY0MDc2MUYwNzBDNTY5MAA=",
    timestamp: "1731139200",
    type: "text",
    text: { body: "Hello!" },
  },
};

const STATUS_OUTPUT: OutputField[] = [
  { key: "messageId", type: "string", label: "Message ID" },
  { key: "status", type: "string", label: "Status (sent, delivered, read, failed)" },
  { key: "recipientId", type: "string", label: "Recipient (WhatsApp ID)" },
  { key: "timestamp", type: "number", label: "Timestamp (epoch seconds)" },
  { key: "phoneNumberId", type: "string", label: "Business Phone Number ID" },
  { key: "displayPhoneNumber", type: "string", label: "Business Phone Number" },
  { key: "errors", type: "array", label: "Errors (failed only)" },
];

const STATUS_SAMPLE: StatusEvent = {
  messageId: "wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBI5QTNDQTVCM0Q0Q0Q2RTY3RTcA",
  status: "delivered",
  recipientId: "16505551234",
  timestamp: 1731139260,
  phoneNumberId: "106540352242922",
  displayPhoneNumber: "15551234567",
  errors: [],
};

function epoch(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/** The `messages` changes of a verified WhatsApp Business Account delivery. */
function changeValues(payload: MetaPayload): Record<string, unknown>[] {
  if (payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) return [];
  const out: Record<string, unknown>[] = [];
  for (const entry of payload.entry) {
    for (const change of entry?.changes ?? []) {
      if (change?.field === "messages" && obj(change.value)) out.push(change.value!);
    }
  }
  return out;
}

export function messageEvents(payload: MetaPayload): MessageEvent[] {
  const out: MessageEvent[] = [];
  for (const v of changeValues(payload)) {
    const meta = obj(v.metadata);
    const contacts = Array.isArray(v.contacts) ? v.contacts.map(obj) : [];
    for (const m of Array.isArray(v.messages) ? v.messages : []) {
      const message = obj(m);
      if (!message) continue;
      const from = str(message.from);
      const contact = contacts.find((c) => c && str(c.wa_id) === from);
      out.push({
        messageId: str(message.id),
        from,
        contactName: str(obj(contact?.profile)?.name),
        timestamp: epoch(message.timestamp),
        type: str(message.type),
        text: str(obj(message.text)?.body),
        phoneNumberId: str(meta?.phone_number_id),
        displayPhoneNumber: str(meta?.display_phone_number),
        message,
      });
    }
  }
  return out;
}

export function statusEvents(payload: MetaPayload): StatusEvent[] {
  const out: StatusEvent[] = [];
  for (const v of changeValues(payload)) {
    const meta = obj(v.metadata);
    for (const s of Array.isArray(v.statuses) ? v.statuses : []) {
      const status = obj(s);
      if (!status) continue;
      out.push({
        messageId: str(status.id),
        status: str(status.status),
        recipientId: str(status.recipient_id),
        timestamp: epoch(status.timestamp),
        phoneNumberId: str(meta?.phone_number_id),
        displayPhoneNumber: str(meta?.display_phone_number),
        errors: Array.isArray(status.errors) ? status.errors : [],
      });
    }
  }
  return out;
}

/** Inbound customer messages (manual webhook, signed with the App Secret). */
export const messageReceivedTrigger: TriggerDefinition<MetaParams, MessageEvent, TriggerState> = {
  key: "message-received",
  title: "Message Received",
  description:
    "Fires for each message a customer sends to your WhatsApp Business number. The run gets the sender, message type and text, plus the raw message.",
  params: META_PARAMS,
  output: MESSAGE_OUTPUT,
  sample: MESSAGE_SAMPLE,
  onSubscribe({ callbackUrl }) {
    return { callbackUrl };
  },
  onUnsubscribe() {},
  handleIngest({ raw, params }) {
    return ingestMeta(raw, params, messageEvents);
  },
};

/** Delivery receipts for messages you sent. */
export const messageStatusTrigger: TriggerDefinition<MetaParams, StatusEvent, TriggerState> = {
  key: "message-status",
  title: "Message Status Changed",
  description:
    "Fires when a message you sent is sent, delivered, read or fails. The run gets the message ID, the new status and the recipient.",
  params: META_PARAMS,
  output: STATUS_OUTPUT,
  sample: STATUS_SAMPLE,
  onSubscribe({ callbackUrl }) {
    return { callbackUrl };
  },
  onUnsubscribe() {},
  handleIngest({ raw, params }) {
    return ingestMeta(raw, params, statusEvents);
  },
};
