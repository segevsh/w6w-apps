import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { verifyTwilioSignature } from "./triggers.ts";

/**
 * Twilio call-status and Event Streams triggers (rfcs/trigger.md, manual-webhook form).
 * Vendor docs, verified 2026-11-10:
 *   - Voice status callbacks (form-encoded, signed like every classic webhook):
 *     https://www.twilio.com/docs/voice/api/call-resource#statuscallback
 *   - Event Streams webhook sink (a JSON array of CloudEvents):
 *     https://www.twilio.com/docs/events/webhook-quickstart
 *   - Signature scheme, incl. the `bodySHA256` rule for JSON bodies:
 *     https://www.twilio.com/docs/usage/webhooks/webhooks-security
 *
 * Both reuse the message triggers' trust model: the callback URL is on record in the subscription
 * state (`onSubscribe` makes no Twilio call), the Auth Token is a secret param, and a delivery is
 * verified over its RAW body before anything is parsed. The Event Streams sink is created in the
 * Twilio Console or CLI (it needs `events.twilio.com`, a host this app does not call).
 */

export interface EventTriggerParams {
  authToken?: string;
  /** Any-event trigger only: comma-separated CloudEvent types, empty = every type. */
  events?: string;
}

export interface EventTriggerState {
  callbackUrl: string;
}

const AUTH_TOKEN: Param = {
  key: "authToken",
  label: "Auth Token",
  type: "secret",
  required: true,
  hint:
    "Twilio Console, Account info, Auth Token. Twilio signs every webhook with it; a request that does not verify is refused.",
};

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Event types",
  type: "string",
  placeholder: "com.twilio.voice.insights.call-summary.complete",
  hint:
    "Comma-separated Event Streams types to react to. Leave empty for every event the sink delivers.",
};

// ---------------------------------------------------------------- call status callbacks

export interface CallEvent {
  callSid: string | null;
  accountSid: string | null;
  from: string | null;
  to: string | null;
  callStatus: string | null;
  direction: string | null;
  callDuration: number | null;
  parentCallSid: string | null;
  params: Record<string, string>;
}

const CALL_OUTPUT: OutputField[] = [
  { key: "callSid", type: "string", label: "Call SID" },
  { key: "accountSid", type: "string", label: "Account SID" },
  { key: "from", type: "string", label: "From" },
  { key: "to", type: "string", label: "To" },
  { key: "callStatus", type: "string", label: "Call Status" },
  { key: "direction", type: "string", label: "Direction" },
  { key: "callDuration", type: "number", label: "Duration (seconds)" },
  { key: "parentCallSid", type: "string", label: "Parent Call SID" },
  { key: "params", type: "object", label: "All Parameters" },
];

const CALL_SAMPLE: CallEvent = {
  callSid: "CAsample-call-sid",
  accountSid: "sample-account-sid",
  from: "+15017122661",
  to: "+15558675310",
  callStatus: "completed",
  direction: "outbound-api",
  callDuration: 42,
  parentCallSid: null,
  params: {
    CallSid: "CAsample-call-sid",
    AccountSid: "sample-account-sid",
    From: "+15017122661",
    To: "+15558675310",
    CallStatus: "completed",
    Direction: "outbound-api",
    CallDuration: "42",
  },
};

function normalizeCall(form: URLSearchParams): CallEvent {
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = v;
  const seconds = Number(params.CallDuration);
  return {
    callSid: params.CallSid ?? null,
    accountSid: params.AccountSid ?? null,
    from: params.From ?? null,
    to: params.To ?? null,
    callStatus: params.CallStatus ?? null,
    direction: params.Direction ?? null,
    callDuration: params.CallDuration !== undefined && Number.isFinite(seconds) ? seconds : null,
    parentCallSid: params.ParentCallSid ?? null,
    params,
  };
}

/** A status callback for a call (initiated, ringing, answered, completed, busy, failed...). */
export function callStatusTrigger(
  spec: { key: string; title: string; description: string },
): TriggerDefinition<EventTriggerParams, CallEvent, EventTriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [AUTH_TOKEN],
    output: CALL_OUTPUT,
    sample: CALL_SAMPLE,

    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params, state }) {
      const form = await verifyTwilioSignature(raw, params?.authToken, state?.callbackUrl);
      const event = normalizeCall(form);
      // A status callback names the call and its status; anything else is not one.
      return event.callSid !== null && event.callStatus !== null ? [event] : [];
    },
  };
}

// ---------------------------------------------------------------- Event Streams

export interface StreamEvent {
  id: string | null;
  type: string;
  source: string | null;
  time: string | null;
  dataSchema: string | null;
  data: unknown;
}

const STREAM_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Event ID" },
  { key: "type", type: "string", label: "Event Type" },
  { key: "source", type: "string", label: "Source" },
  { key: "time", type: "string", label: "Time" },
  { key: "dataSchema", type: "string", label: "Data Schema" },
  { key: "data", type: "object", label: "Event Data" },
];

const SUMMARY_TYPE = "com.twilio.voice.insights.call-summary.complete";

const STREAM_SAMPLE: StreamEvent = {
  id: "EZsample-event-id",
  type: SUMMARY_TYPE,
  source: "/v1/Voice/CAsample-call-sid/Summary",
  time: "2026-11-09T22:56:33.000Z",
  dataSchema: "VoiceInsights.CallSummary/1",
  data: {
    call_sid: "CAsample-call-sid",
    account_sid: "sample-account-sid",
    start_time: "2026-11-09T22:56:28Z",
    end_time: "2026-11-09T22:56:33Z",
    duration: 5,
    call_state: "completed",
  },
};

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Throws unless the delivery carries a valid Event Streams signature for `url`; returns the raw
 * body text. A JSON body is signed as `url?bodySHA256=<sha256 hex of the raw body>` with no form
 * parameters, so a changed body changes the signed URL.
 */
export async function verifyEventStreamSignature(
  raw: { method: string; rawBody?: unknown; headers: Record<string, string> },
  authToken: unknown,
  url: unknown,
): Promise<string> {
  const token = requireSecret(authToken);
  const body = requireRawBody(raw);
  if (typeof url !== "string" || url === "") {
    throw new Error("Twilio delivery refused: this subscription has no callback URL on record.");
  }
  if (raw.method.toUpperCase() !== "POST") {
    throw new Error(
      "Twilio delivery refused: Event Streams deliveries are verified for POST only.",
    );
  }
  const signature = header(raw, "x-twilio-signature");
  if (!signature) throw new Error("Twilio delivery refused: the signature header is missing.");
  const signedUrl = `${url}${url.includes("?") ? "&" : "?"}bodySHA256=${await sha256Hex(body)}`;
  const expected = await hmac("SHA-1", token, signedUrl, "base64");
  if (!timingSafeEqual(expected, signature)) {
    throw new Error("Twilio delivery refused: the signature does not match.");
  }
  return body;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

function normalizeStream(item: unknown): StreamEvent | null {
  if (item === null || typeof item !== "object" || Array.isArray(item)) return null;
  const e = item as Record<string, unknown>;
  const type = str(e.type);
  if (!type) return null;
  let data = e.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch { /* keep the text */ }
  }
  return {
    id: str(e.id),
    type,
    source: str(e.source),
    time: str(e.time),
    dataSchema: str(e.dataschema),
    data: data ?? null,
  };
}

/** Comma-separated event types, trimmed and de-duplicated. */
export function parseTypes(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter((s) => s !== ""))];
}

/**
 * An Event Streams webhook sink. `type` fixes the CloudEvent type for a named trigger; without it
 * the trigger takes the `events` param as a filter (empty = every event).
 */
export function eventStreamTrigger(
  spec: { key: string; title: string; description: string; type?: string },
): TriggerDefinition<EventTriggerParams, StreamEvent, EventTriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.type ? [AUTH_TOKEN] : [AUTH_TOKEN, EVENTS_PARAM],
    output: STREAM_OUTPUT,
    sample: spec.type ? { ...STREAM_SAMPLE, type: spec.type } : STREAM_SAMPLE,

    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params, state }) {
      const body = await verifyEventStreamSignature(raw, params?.authToken, state?.callbackUrl);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Twilio Event Streams delivery is not JSON.");
      }
      const wanted = spec.type ? [spec.type] : parseTypes(params?.events);
      const out: StreamEvent[] = [];
      for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
        const event = normalizeStream(item);
        if (event && (wanted.length === 0 || wanted.includes(event.type))) out.push(event);
      }
      return out;
    },
  };
}
