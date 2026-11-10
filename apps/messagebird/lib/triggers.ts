import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";

/**
 * MessageBird inbound SMS trigger (rfcs/trigger.md, webhook form, manual setup, signed).
 *
 * MessageBird forwards a message received on a virtual mobile number to a URL set in Flow Builder
 * ("Forward to URL" step) or by MessageBird support; there is no registration API. Every request
 * MessageBird sends carries `MessageBird-Signature-JWT`, a JWT signed HS256 with the account's
 * SIGNING KEY (D5 (2): pasted as `signingKey`). Verified before the body is parsed:
 *
 *   - header `alg` must be `HS256`; the HMAC-SHA256 of `header.payload` under the signing key must
 *     match the JWT signature (constant time);
 *   - claims: `iss` is `MessageBird`; `nbf` and `exp` bracket now (a few seconds of leeway);
 *   - `url_hash` is the SHA-256 hex of the URL MessageBird called, which for a manual webhook is the
 *     callback URL stored in the subscription `state`;
 *   - `payload_hash` is the SHA-256 hex of the exact received body.
 *
 * Only POST deliveries can be verified: a GET callback has no body for the host to hash and a query
 * string the host cannot reproduce byte for byte, so it is refused. Configure the number to POST.
 *
 * Trust model: the signature binds the URL and the body, and the token is time-boxed by `nbf`/`exp`.
 * The `jti` claim could detect replay inside that window, but a handler cannot write state, so an
 * identical delivery replayed before `exp` is not detected; de-duplicate on the message id.
 *
 * Docs (verified 2026-11-10): https://developers.messagebird.com/api/ ("Verifying HTTP requests"),
 * https://developers.messagebird.com/api/sms-messaging/ ("Receive and handle inbound SMS") and
 * MessageBird's PHP SDK RequestValidator for the URL and payload hashing
 * (https://github.com/messagebird/php-rest-api/blob/master/src/MessageBird/RequestValidator.php)
 */

export interface TriggerParams {
  signingKey?: string;
}

/** The run's `trigger.event`: one inbound SMS. */
export interface InboundSms {
  id: string | null;
  recipient: string | null;
  originator: string | null;
  body: string | null;
  createdDatetime: string | null;
  data: Record<string, unknown>;
}

const LEEWAY_SEC = 5;

const SIGNING_KEY_PARAM: Param = {
  key: "signingKey",
  label: "Signing key",
  type: "secret",
  required: true,
  hint:
    "Your MessageBird signing key (the one the Dashboard lets you regenerate, see 'Verifying HTTP requests' in the docs). MessageBird signs every callback with it; a callback that does not verify is refused.",
};

const OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Message ID" },
  { key: "recipient", type: "string", label: "Recipient (your number)" },
  { key: "originator", type: "string", label: "Sender" },
  { key: "body", type: "string", label: "Message text" },
  { key: "createdDatetime", type: "string", label: "Created (RFC 3339)" },
  { key: "data", type: "object", label: "Full callback data" },
];

const SAMPLE: InboundSms = {
  id: "e8077d803532c0b5937c639b60216938",
  recipient: "31642500190",
  originator: "31612345678",
  body: "This is an incoming message",
  createdDatetime: "2026-11-10T10:30:00+00:00",
  data: {
    id: "e8077d803532c0b5937c639b60216938",
    recipient: "31642500190",
    originator: "31612345678",
    body: "This is an incoming message",
    createdDatetime: "2026-11-10T10:30:00+00:00",
  },
};

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

const enc = new TextEncoder();

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function b64urlDecode(s: string): string | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) return null;
  try {
    const b = atob(
      s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "="),
    );
    return new TextDecoder().decode(Uint8Array.from(b, (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

const b64urlOf = (b64: string) => b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function json(text: string | null): Record<string, unknown> | null {
  if (text === null) return null;
  try {
    return asObject(JSON.parse(text));
  } catch {
    return null;
  }
}

/**
 * Verify the `MessageBird-Signature-JWT` header against the signing key, the callback URL and the
 * exact received body, then parse the body. Throws (never echoing the key, the token or the body)
 * unless every check passes; an unset key is refused before any compare.
 */
export async function verifyDelivery(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  signingKey: unknown,
  callbackUrl: unknown,
  nowMs: number = Date.now(),
): Promise<Record<string, unknown>> {
  const key = requireSecret(signingKey);
  const body = requireRawBody(raw);
  const token = header(raw, "messagebird-signature-jwt");
  const parts = token ? token.trim().split(".") : [];
  if (parts.length !== 3) {
    throw new Error("MessageBird delivery refused: the signature header is missing or malformed.");
  }
  const head = json(b64urlDecode(parts[0]));
  if (!head || head.alg !== "HS256") {
    throw new Error("MessageBird delivery refused: the token must be signed with HS256.");
  }
  const expected = b64urlOf(await hmac("SHA-256", key, `${parts[0]}.${parts[1]}`, "base64"));
  if (!timingSafeEqual(expected, parts[2])) {
    throw new Error("MessageBird delivery refused: the signature does not match.");
  }
  const claims = json(b64urlDecode(parts[1]));
  const nowSec = Math.floor(nowMs / 1000);
  if (
    !claims || claims.iss !== "MessageBird" || typeof claims.nbf !== "number" ||
    typeof claims.exp !== "number" || claims.nbf > nowSec + LEEWAY_SEC ||
    claims.exp < nowSec - LEEWAY_SEC
  ) {
    throw new Error(
      "MessageBird delivery refused: the token claims are invalid or outside their window.",
    );
  }
  if (typeof callbackUrl !== "string" || callbackUrl === "") {
    throw new Error("MessageBird delivery refused: the subscription has no stored callback URL.");
  }
  if (
    typeof claims.url_hash !== "string" ||
    !timingSafeEqual(await sha256Hex(callbackUrl), claims.url_hash.toLowerCase())
  ) {
    throw new Error("MessageBird delivery refused: the token is for another URL.");
  }
  if (
    body === "" || typeof claims.payload_hash !== "string" ||
    !timingSafeEqual(await sha256Hex(body), claims.payload_hash.toLowerCase())
  ) {
    throw new Error("MessageBird delivery refused: the token does not match the body.");
  }
  const parsed = json(body);
  if (parsed) return parsed;
  const out: Record<string, unknown> = {};
  for (const [k, v] of new URLSearchParams(body)) out[k] = v;
  if (Object.keys(out).length === 0 || /^\s*[\[{]/.test(body)) {
    throw new Error("Not a MessageBird callback: expected JSON or form fields.");
  }
  return out;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
}

/** Build the MessageBird inbound SMS trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, InboundSms, { callbackUrl: string }> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [SIGNING_KEY_PARAM],
    output: OUTPUT,
    sample: SAMPLE,

    // Manual webhook whose signature covers the URL: remember the URL, make no vendor call.
    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },
    onUnsubscribe() {},

    async handleIngest({ raw, params, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(
          "MessageBird callbacks can only be verified when delivered with POST; set the number to POST.",
        );
      }
      const data = await verifyDelivery(
        raw,
        params?.signingKey,
        (state as { callbackUrl?: unknown } | undefined)?.callbackUrl,
      );
      return [{
        id: str(data.id),
        recipient: str(data.recipient),
        originator: str(data.originator),
        body: typeof data.body === "string" ? data.body : null,
        createdDatetime: str(data.createdDatetime),
        data,
      }];
    },
  };
}
