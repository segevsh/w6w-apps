import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { ThriveCartClient } from "./client.ts";

/**
 * ThriveCart event-subscription triggers (rfcs/trigger.md, webhook form, API-registered, UNSIGNED).
 *
 *   - `onSubscribe` registers the trigger's callback URL for one event with
 *     `POST /api/external/subscribe` (JSON `{ event, target_url, trigger_fields? }`) and keeps the
 *     URL and the `subscription_id` in the subscription `state`.
 *   - `onUnsubscribe` removes it with `POST /api/external/unsubscribe` (form field `url`):
 *     ThriveCart unsubscribes BY URL, which is why every subscription gets its own callback URL. A
 *     subscription ThriveCart no longer has (404) counts as removed.
 *   - `handleIngest` has nothing to verify: ThriveCart's event-subscription documentation describes
 *     no signature, secret or signing header, so none is invented. The delivery is a JSON POST; the
 *     trigger checks the method and that the body is a JSON object.
 *
 * Trust model: the callback URL is the secret. The host issues it per subscription as a long
 * unguessable id; anyone who learns it can post a forged delivery to it.
 *
 * Docs (verified 2026-11-10): https://developers.thrivecart.com/documentation/event_subscription/intro/
 * and https://apidocs.thrivecart.com/ (Create event subscription, Unsubscribe from an event)
 */

export interface TriggerParams {
  event?: string;
  triggerFields?: unknown;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  event: string;
  callbackUrl: string;
  subscriptionId: number | string | null;
}

/** The run's `trigger.event`: one ThriveCart event delivery. */
export interface ThriveCartEvent {
  event: string | null;
  webhookId: string | null;
  eventId: string | null;
  data: Record<string, unknown>;
}

/** The event keys ThriveCart's developer portal lists (the wildcard `*` receives all of them). */
export const KNOWN_EVENTS = [
  "*",
  "order_created",
  "order_payment_product",
  "order_payment_bump",
  "order_payment_upsell",
  "order_payment_downsell",
  "order_payment_declined_product",
  "order_refund",
  "order_rebill",
  "order_rebill_failed",
  "order_rebill_completed",
  "order_rebill_cancelled",
  "order_refund_product",
  "order_refund_bump",
  "order_refund_upsell",
  "order_refund_downsell",
  "subscription_paused",
  "subscription_resumed",
  "cart_abandoned",
  "affiliate_created",
  "affiliate_approved",
  "affiliate_rejected",
  "affiliate_commission_earned",
  "affiliate_commission_payout",
  "affiliate_commission_refund",
];

const EVENT_PARAM: Param = {
  key: "event",
  label: "Event",
  type: "string",
  required: true,
  hint: `A ThriveCart event key, or * for all events. Known keys: ${KNOWN_EVENTS.join(", ")}.`,
};

const TRIGGER_FIELDS_PARAM: Param = {
  key: "triggerFields",
  label: "Trigger fields",
  type: "json",
  advanced: true,
  hint:
    'Optional ThriveCart filter object, e.g. {"mode_int": 2, "base_product": [5, 19]}. Which fields an event accepts is listed on its page in the ThriveCart developer portal.',
};

const OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event" },
  { key: "webhookId", type: "string", label: "Delivery ID (webhook_id, stable across retries)" },
  { key: "eventId", type: "string", label: "Event ID (event_id, may be absent)" },
  { key: "data", type: "object", label: "Full Delivery" },
];

const SAMPLE: ThriveCartEvent = {
  event: "order_payment_product",
  webhookId: "2f0c6c1e-8d57-4e0a-9a43-6c1d5b7f9a10",
  eventId: "10293847",
  data: {
    event: "order_payment_product",
    webhook_id: "2f0c6c1e-8d57-4e0a-9a43-6c1d5b7f9a10",
    event_id: 10293847,
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

/** True for the "no such subscription" answer `ThriveCartClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^ThriveCart 404\b/.test(err.message);
}

/** The `event` param → a validated key (known, or any lowercase snake_case key ThriveCart adds). */
export function chooseEvent(raw: unknown, fixed?: string): string {
  const event = fixed ?? String(raw ?? "").trim();
  if (!event) throw new Error("Choose the ThriveCart event to subscribe to (or * for all).");
  if (event !== "*" && !/^[a-z][a-z0-9_]{2,63}$/.test(event)) {
    throw new Error(
      `Not a ThriveCart event key: expected * or a lowercase snake_case key such as order_payment_product.`,
    );
  }
  return event;
}

/** `triggerFields` arrives as a live object or as the JSON text a form field carried. */
export function parseTriggerFields(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const value = typeof raw === "string"
    ? (() => {
      try {
        return JSON.parse(raw);
      } catch {
        throw new Error("`triggerFields` is not valid JSON.");
      }
    })()
    : raw;
  const obj = asObject(value);
  if (!obj) throw new Error("`triggerFields` must be a JSON object.");
  return Object.keys(obj).length > 0 ? obj : undefined;
}

/** The delivery body → its object. ThriveCart event subscriptions always POST JSON. */
function parseDelivery(raw: { body: unknown; rawBody?: string }): Record<string, unknown> {
  let body = raw.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch { /* falls through to the refusal below */ }
  }
  const obj = asObject(body);
  if (!obj) throw new Error("ThriveCart delivery refused: the body is not a JSON object.");
  return obj;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The event this trigger subscribes to. Absent: the user picks one with the `event` param. */
  event?: string;
}

/** Build one ThriveCart event-subscription webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, ThriveCartEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.event ? [TRIGGER_FIELDS_PARAM] : [EVENT_PARAM, TRIGGER_FIELDS_PARAM],
    output: OUTPUT,
    sample: spec.event
      ? {
        ...SAMPLE,
        event: spec.event,
        data: { ...SAMPLE.data, event: spec.event },
      }
      : SAMPLE,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const event = chooseEvent(params?.event, spec.event);
      const triggerFields = parseTriggerFields(params?.triggerFields);
      const made = await new ThriveCartClient(ctx).post<{ subscription_id?: unknown }>(
        "/subscribe",
        {
          json: {
            event,
            target_url: callbackUrl,
            ...(triggerFields ? { trigger_fields: triggerFields } : {}),
          },
        },
      );
      const id = made?.subscription_id;
      return {
        event,
        callbackUrl,
        subscriptionId: typeof id === "number" || typeof id === "string" ? id : null,
      };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const url = (state as Partial<TriggerState> | undefined)?.callbackUrl;
      if (typeof url !== "string" || url === "") return;
      try {
        await new ThriveCartClient(ctx).post("/unsubscribe", { form: { url } });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`ThriveCart delivers webhooks with POST, not ${raw.method}.`);
      }
      const data = parseDelivery(raw);
      const subscribed = (state as Partial<TriggerState> | undefined)?.event;
      const named = str(data.event) ?? (subscribed && subscribed !== "*" ? subscribed : null) ??
        (spec.event && spec.event !== "*" ? spec.event : null);
      return [{
        event: named,
        webhookId: str(data.webhook_id),
        eventId: str(data.event_id),
        data,
      }];
    },
  };
}
