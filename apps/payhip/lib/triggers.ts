import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import { requireRawBody, requireSecret, timingSafeEqual } from "../../_shared/webhook/mod.ts";

/**
 * Payhip webhook triggers (rfcs/trigger.md, webhook form, manual receiver).
 *
 *   - Payhip webhooks are configured in the seller's own Settings, Developer tab, not through the
 *     API, so `onSubscribe` makes no Payhip call: it hands back the `callbackUrl` the user pastes
 *     there and `onUnsubscribe` is a no-op. One endpoint receives every event the seller ticked;
 *     each trigger acknowledges the deliveries of the other types without a run.
 *   - Trust model: every delivery body carries a `signature` field that Payhip documents as
 *     `sha256(<the seller's API key>)`. That is a static shared token, NOT an HMAC of the body and
 *     with no timestamp: it proves the sender knows the key, it does not bind the body, and a
 *     captured delivery can be replayed. `handleIngest` therefore compares it in constant time
 *     (after `requireSecret`/`requireRawBody`) and refuses anything else, and the README says the
 *     unguessable callback URL is a second, independent secret that matters.
 *
 * Docs (verified 2026-11-10): https://help.payhip.com/article/115-webhooks
 */

export interface TriggerParams {
  apiKey?: string;
}

const API_KEY_PARAM: Param = {
  key: "apiKey",
  label: "Payhip API Key",
  type: "secret",
  required: true,
  hint:
    "Payhip Settings, Developer tab, API key. Payhip puts sha256 of this key in every delivery's signature field; a delivery that does not match is refused.",
};

/** The run's `trigger.event` for a sale (paid) or a refund. */
export interface SaleEvent {
  type: string;
  transactionId: string | null;
  email: string | null;
  currency: string | null;
  price: number | null;
  items: unknown[];
  paymentType: string | null;
  date: number | null;
  amountRefunded: number | null;
  dateRefunded: number | null;
  dateCreated: number | null;
}

/** The run's `trigger.event` for a subscription starting or being cancelled. */
export interface SubscriptionEvent {
  type: string;
  subscriptionId: string | null;
  customerId: string | null;
  status: string | null;
  customerEmail: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  planName: string | null;
  productName: string | null;
  productLink: string | null;
  dateSubscriptionStarted: number | null;
  dateSubscriptionDeleted: number | null;
}

export const SALE_OUTPUT: OutputField[] = [
  { key: "type", type: "string", label: "Event Type" },
  { key: "transactionId", type: "string", label: "Transaction ID" },
  { key: "email", type: "string", label: "Buyer Email" },
  { key: "currency", type: "string", label: "Currency" },
  { key: "price", type: "number", label: "Price (minor units)" },
  { key: "items", type: "array", label: "Items" },
  { key: "paymentType", type: "string", label: "Payment Type" },
  { key: "date", type: "number", label: "Date (epoch seconds)" },
  { key: "amountRefunded", type: "number", label: "Amount Refunded (minor units)" },
  { key: "dateRefunded", type: "number", label: "Date Refunded (epoch seconds)" },
  { key: "dateCreated", type: "number", label: "Date Created (epoch seconds)" },
];

export const SUBSCRIPTION_OUTPUT: OutputField[] = [
  { key: "type", type: "string", label: "Event Type" },
  { key: "subscriptionId", type: "string", label: "Subscription ID" },
  { key: "customerId", type: "string", label: "Customer ID" },
  { key: "status", type: "string", label: "Status" },
  { key: "customerEmail", type: "string", label: "Customer Email" },
  { key: "customerFirstName", type: "string", label: "Customer First Name" },
  { key: "customerLastName", type: "string", label: "Customer Last Name" },
  { key: "planName", type: "string", label: "Plan Name" },
  { key: "productName", type: "string", label: "Product Name" },
  { key: "productLink", type: "string", label: "Product Link" },
  { key: "dateSubscriptionStarted", type: "number", label: "Started (epoch seconds)" },
  { key: "dateSubscriptionDeleted", type: "number", label: "Cancelled (epoch seconds)" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Check the body's `signature` against `sha256(apiKey)`. Throws (never echoing the key or the
 * signature) unless it matches; an unset key is refused before any compare. Returns the parsed
 * body. Payhip's signature is a field of the JSON body, so the body is parsed to read it — it is
 * not trusted or emitted until the compare has passed.
 */
export async function verifySignature(
  raw: { rawBody?: unknown },
  apiKey: unknown,
): Promise<Record<string, unknown>> {
  const key = requireSecret(apiKey);
  const text = requireRawBody(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Payhip delivery refused: the body is not JSON.");
  }
  const body = asObject(parsed);
  const given = body?.signature;
  if (typeof given !== "string" || given === "") {
    throw new Error("Payhip delivery refused: the body carries no signature.");
  }
  if (!timingSafeEqual(await sha256Hex(key), given.toLowerCase())) {
    throw new Error("Payhip delivery refused: the signature does not match.");
  }
  return body!;
}

export function normalizeSale(b: Record<string, unknown>): SaleEvent {
  return {
    type: str(b.type) ?? "",
    transactionId: str(b.id),
    email: str(b.email),
    currency: str(b.currency),
    price: num(b.price),
    items: Array.isArray(b.items) ? b.items : [],
    paymentType: str(b.payment_type),
    date: num(b.date),
    amountRefunded: num(b.amount_refunded),
    dateRefunded: num(b.date_refunded),
    dateCreated: num(b.date_created),
  };
}

export function normalizeSubscription(b: Record<string, unknown>): SubscriptionEvent {
  return {
    type: str(b.type) ?? "",
    subscriptionId: str(b.subscription_id),
    customerId: str(b.customer_id),
    status: str(b.status),
    customerEmail: str(b.customer_email),
    customerFirstName: str(b.customer_first_name),
    customerLastName: str(b.customer_last_name),
    planName: str(b.plan_name),
    productName: str(b.product_name),
    productLink: str(b.product_link),
    dateSubscriptionStarted: num(b.date_subscription_started),
    dateSubscriptionDeleted: num(b.date_subscription_deleted),
  };
}

export interface WebhookTriggerSpec<E> {
  key: string;
  title: string;
  description: string;
  /** Payhip's `type` for this trigger's deliveries. */
  type: "paid" | "refunded" | "subscription.created" | "subscription.deleted";
  output: OutputField[];
  sample: E;
  normalize(body: Record<string, unknown>): E;
}

/** Build one Payhip event webhook trigger. */
export function webhookTrigger<E extends { type: string }>(
  spec: WebhookTriggerSpec<E>,
): TriggerDefinition<TriggerParams, E, { callbackUrl: string }> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [API_KEY_PARAM],
    output: spec.output,
    sample: spec.sample,
    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },
    onUnsubscribe() {},
    async handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Payhip delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, params?.apiKey);
      // Other event types (and unknown ones) are acknowledged without a run.
      if (body.type !== spec.type) return [];
      return [spec.normalize(body)];
    },
  };
}
