import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";

/**
 * Twilio webhook triggers (rfcs/trigger.md, manual-webhook form).
 *
 * Twilio signs a webhook with `X-Twilio-Signature`: base64 HMAC-SHA1, keyed by the account Auth
 * Token, over the FULL request URL followed by every POST parameter as `name` + `value`, sorted by
 * name. The signature therefore covers the URL, so:
 *   - `onSubscribe` makes no Twilio call (the URL is pasted into the number's or the messaging
 *     service's webhook field by hand) and returns the exact `callbackUrl` it must be;
 *   - `handleIngest` signs `state.callbackUrl` + the sorted form parameters of the RAW body.
 * The Auth Token is not readable by a hook (the connection only signs outgoing requests), so the
 * trigger takes it as a secret param (D5 (2)). Only form-encoded webhooks (SMS, MMS, status
 * callbacks) are accepted; a JSON body cannot match the form scheme and is refused.
 * Twilio expects TwiML back from an inbound-message webhook; the host's JSON ack is read as an
 * empty reply, so a workflow that must answer in-line should reply through the Send SMS action.
 */

export interface TriggerParams {
  authToken?: string;
}

export interface TriggerState {
  callbackUrl: string;
}

export interface MessageEvent {
  messageSid: string | null;
  accountSid: string | null;
  from: string | null;
  to: string | null;
  body: string | null;
  messageStatus: string | null;
  errorCode: string | null;
  numMedia: number;
  mediaUrls: string[];
  params: Record<string, string>;
}

const AUTH_TOKEN_PARAM: Param = {
  key: "authToken",
  label: "Auth Token",
  type: "secret",
  required: true,
  hint:
    "Twilio Console, Account info, Auth Token. Twilio signs every webhook with it; a request that does not verify is refused.",
};

export const EVENT_OUTPUT: OutputField[] = [
  { key: "messageSid", type: "string", label: "Message SID" },
  { key: "accountSid", type: "string", label: "Account SID" },
  { key: "from", type: "string", label: "From" },
  { key: "to", type: "string", label: "To" },
  { key: "body", type: "string", label: "Body" },
  { key: "messageStatus", type: "string", label: "Message Status" },
  { key: "errorCode", type: "string", label: "Error Code" },
  { key: "numMedia", type: "number", label: "Media Count" },
  { key: "mediaUrls", type: "array", label: "Media URLs" },
  { key: "params", type: "object", label: "All Parameters" },
];

export const INCOMING_SAMPLE: MessageEvent = {
  messageSid: "SM0123456789abcdef0123456789abcdef",
  accountSid: "AC0123456789abcdef0123456789abcdef",
  from: "+15558675310",
  to: "+15017122661",
  body: "Hello from a phone",
  messageStatus: null,
  errorCode: null,
  numMedia: 0,
  mediaUrls: [],
  params: {
    MessageSid: "SM0123456789abcdef0123456789abcdef",
    AccountSid: "AC0123456789abcdef0123456789abcdef",
    From: "+15558675310",
    To: "+15017122661",
    Body: "Hello from a phone",
    NumMedia: "0",
  },
};

export const STATUS_SAMPLE: MessageEvent = {
  ...INCOMING_SAMPLE,
  body: null,
  messageStatus: "delivered",
  params: {
    MessageSid: "SM0123456789abcdef0123456789abcdef",
    AccountSid: "AC0123456789abcdef0123456789abcdef",
    From: "+15017122661",
    To: "+15558675310",
    MessageStatus: "delivered",
  },
};

/** The string Twilio signs: the URL, then each parameter's name and value, sorted by name. */
export function signedString(url: string, form: URLSearchParams): string {
  const pairs = [...form.entries()].sort(([ak, av], [bk, bv]) =>
    ak < bk ? -1 : ak > bk ? 1 : av < bv ? -1 : av > bv ? 1 : 0
  );
  return url + pairs.map(([k, v]) => k + v).join("");
}

/** Throws unless the delivery carries a valid Twilio signature for `url`; returns the parsed form. */
export async function verifyTwilioSignature(
  raw: { method: string; rawBody?: unknown; headers: Record<string, string> },
  authToken: unknown,
  url: unknown,
): Promise<URLSearchParams> {
  const token = requireSecret(authToken);
  const body = requireRawBody(raw);
  if (typeof url !== "string" || url === "") {
    throw new Error("Twilio delivery refused: this subscription has no callback URL on record.");
  }
  if (raw.method.toUpperCase() !== "POST") {
    throw new Error("Twilio delivery refused: webhooks are verified for POST requests only.");
  }
  const signature = header(raw, "x-twilio-signature");
  if (!signature) throw new Error("Twilio delivery refused: the signature header is missing.");
  const form = new URLSearchParams(body);
  const expected = await hmac("SHA-1", token, signedString(url, form), "base64");
  if (!timingSafeEqual(expected, signature)) {
    throw new Error("Twilio delivery refused: the signature does not match.");
  }
  return form;
}

function normalize(form: URLSearchParams): MessageEvent {
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = v;
  const numMedia = Number(params.NumMedia ?? 0);
  const mediaUrls: string[] = [];
  for (let i = 0; i < (Number.isInteger(numMedia) ? Math.min(numMedia, 10) : 0); i++) {
    const u = params[`MediaUrl${i}`];
    if (u) mediaUrls.push(u);
  }
  return {
    messageSid: params.MessageSid ?? params.SmsSid ?? null,
    accountSid: params.AccountSid ?? null,
    from: params.From ?? null,
    to: params.To ?? null,
    body: params.Body ?? null,
    messageStatus: params.MessageStatus ?? null,
    errorCode: params.ErrorCode ?? null,
    numMedia: Number.isInteger(numMedia) ? numMedia : 0,
    mediaUrls,
    params,
  };
}

export interface TwilioTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** `incoming`: a message sent to your number. `status`: a delivery status callback. */
  kind: "incoming" | "status";
}

export function twilioTrigger(
  spec: TwilioTriggerSpec,
): TriggerDefinition<TriggerParams, MessageEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [AUTH_TOKEN_PARAM],
    output: EVENT_OUTPUT,
    sample: spec.kind === "incoming" ? INCOMING_SAMPLE : STATUS_SAMPLE,

    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params, state }) {
      const form = await verifyTwilioSignature(
        raw,
        params?.authToken,
        (state as Partial<TriggerState> | undefined)?.callbackUrl,
      );
      const event = normalize(form);
      const isStatus = event.messageStatus !== null;
      if (spec.kind === "status" ? !isStatus : isStatus || event.body === null) return [];
      return [event];
    },

    parseOutput({ normalized }) {
      return normalized as MessageEvent;
    },
  };
}
