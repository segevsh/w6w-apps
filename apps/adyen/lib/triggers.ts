import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import { hmac, requireRawBody, requireSecret, timingSafeEqual } from "../../_shared/webhook/mod.ts";

/**
 * Adyen webhook triggers (rfcs/trigger.md, webhook form, manual receiver).
 *
 *   - Adyen webhooks are created per company or merchant account in the Customer Area (Developers,
 *     Webhooks), so `onSubscribe` makes no Adyen call: it hands back the `callbackUrl` the user
 *     pastes there and `onUnsubscribe` is a no-op.
 *   - A Standard webhook (JSON method) carries `notificationItems[].NotificationRequestItem`, each
 *     with `additionalData.hmacSignature`: base64 HMAC-SHA256 under the binary form of the
 *     hex-encoded HMAC key (D5 (2): the user pastes the key) over eight fields joined with ":":
 *     `pspReference`, `originalReference`, `merchantAccountCode`, `merchantReference`,
 *     `amount.value`, `amount.currency`, `eventCode`, `success` (an absent field is the empty
 *     string).
 *   - `handleIngest` checks every item before it emits anything.
 *
 * Trust model: the signature covers those eight fields, NOT the rest of the body (`eventDate`,
 * `reason`, `additionalData`, ...) and carries no timestamp, so Adyen's scheme has no replay window
 * and a captured item can be re-sent. The raw body is still required and is what gets parsed (the
 * parsed `raw.body` is never used). Adyen resends an event with the same `eventCode` and
 * `pspReference` after a failed delivery, so the event carries both for a workflow to dedupe on.
 *
 * Docs (verified 2026-11-10):
 * https://docs.adyen.com/development-resources/webhooks/secure-webhooks/verify-hmac-signatures,
 * https://docs.adyen.com/development-resources/webhooks/configure-and-manage and
 * https://docs.adyen.com/development-resources/webhooks/webhook-types
 */

export interface TriggerParams {
  hmacKey?: string;
}

/** The run's `trigger.event`: one Adyen notification item. */
export interface AdyenEvent {
  eventCode: string;
  success: boolean | null;
  pspReference: string | null;
  originalReference: string | null;
  merchantAccountCode: string | null;
  merchantReference: string | null;
  amountValue: number | null;
  currency: string | null;
  eventDate: string | null;
  paymentMethod: string | null;
  reason: string | null;
  live: boolean | null;
  additionalData: Record<string, unknown>;
}

const HMAC_KEY_PARAM: Param = {
  key: "hmacKey",
  label: "HMAC Key",
  type: "secret",
  required: true,
  hint:
    "Customer Area, Developers, Webhooks, your Standard webhook, Security, HMAC key (hex). Adyen signs every notification with it; a delivery that does not verify is refused.",
};

const OUTPUT: OutputField[] = [
  { key: "eventCode", type: "string", label: "Event Code" },
  { key: "success", type: "boolean", label: "Success" },
  { key: "pspReference", type: "string", label: "PSP Reference" },
  { key: "originalReference", type: "string", label: "Original Reference" },
  { key: "merchantAccountCode", type: "string", label: "Merchant Account" },
  { key: "merchantReference", type: "string", label: "Merchant Reference" },
  { key: "amountValue", type: "number", label: "Amount (minor units)" },
  { key: "currency", type: "string", label: "Currency" },
  { key: "eventDate", type: "string", label: "Event Date" },
  { key: "paymentMethod", type: "string", label: "Payment Method" },
  { key: "reason", type: "string", label: "Reason" },
  { key: "live", type: "boolean", label: "Live" },
  { key: "additionalData", type: "object", label: "Additional Data" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** Adyen sends booleans as the strings "true" / "false". */
function bool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

/** The hex HMAC key as bytes, or null when it is not an even-length hex string. */
function hexKey(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** The eight fields Adyen signs, joined with ":" (an absent field is the empty string). */
export function signedString(item: Record<string, unknown>): string {
  const amount = asObject(item.amount);
  return [
    item.pspReference,
    item.originalReference,
    item.merchantAccountCode,
    item.merchantReference,
    amount?.value,
    amount?.currency,
    item.eventCode,
    item.success,
  ].map((v) => (v === undefined || v === null ? "" : String(v))).join(":");
}

/**
 * Verify every notification item of the raw body against the HMAC key; return the items and `live`.
 * Throws (never echoing the key, a signature or the body) unless every item verifies; an unset key
 * is refused before any compare.
 */
export async function verifyDelivery(
  raw: { rawBody?: unknown },
  hmacKey: unknown,
): Promise<{ items: Record<string, unknown>[]; live: unknown }> {
  const secret = requireSecret(hmacKey);
  const body = requireRawBody(raw);
  const key = hexKey(secret);
  if (key === null) {
    throw new Error("Adyen delivery refused: the configured HMAC key is not a hexadecimal string.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("Adyen delivery refused: the body is not JSON (choose the JSON method).");
  }
  const envelope = asObject(parsed);
  const list = envelope?.notificationItems;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("Not an Adyen Standard webhook: expected `notificationItems`.");
  }
  const items: Record<string, unknown>[] = [];
  for (const entry of list) {
    const item = asObject(asObject(entry)?.NotificationRequestItem);
    if (!item) {
      throw new Error("Not an Adyen Standard webhook: expected `NotificationRequestItem`.");
    }
    const given = str(asObject(item.additionalData)?.hmacSignature);
    if (given === null) {
      throw new Error("Adyen delivery refused: the notification carries no HMAC signature.");
    }
    const expected = await hmac("SHA-256", key, signedString(item), "base64");
    if (!timingSafeEqual(expected, given)) {
      throw new Error("Adyen delivery refused: the signature does not match.");
    }
    items.push(item);
  }
  return { items, live: envelope?.live };
}

/** One verified notification item → its event. */
export function normalizeItem(item: Record<string, unknown>, live: unknown): AdyenEvent {
  const amount = asObject(item.amount);
  const { hmacSignature: _signature, ...additional } = asObject(item.additionalData) ?? {};
  return {
    eventCode: str(item.eventCode) ?? "",
    success: bool(item.success),
    pspReference: str(item.pspReference),
    originalReference: str(item.originalReference),
    merchantAccountCode: str(item.merchantAccountCode),
    merchantReference: str(item.merchantReference),
    amountValue: typeof amount?.value === "number" ? amount.value : null,
    currency: str(amount?.currency),
    eventDate: str(item.eventDate),
    paymentMethod: str(item.paymentMethod),
    reason: str(item.reason),
    live: bool(live),
    additionalData: additional,
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The Adyen `eventCode` this trigger fires on. */
  eventCode: string;
  sample: AdyenEvent;
}

/** Build one Adyen event-code webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, AdyenEvent, { callbackUrl: string }> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [HMAC_KEY_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Adyen delivers webhooks with POST, not ${raw.method}.`);
      }
      const { items, live } = await verifyDelivery(raw, params?.hmacKey);
      // Other event codes (and Adyen's test notification) are acknowledged without a run.
      return items
        .filter((item) => item.eventCode === spec.eventCode)
        .map((item) => normalizeItem(item, live));
    },
  };
}
