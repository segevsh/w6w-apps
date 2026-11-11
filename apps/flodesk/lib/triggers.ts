import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { FlodeskClient } from "./client.ts";

/**
 * Flodesk webhook triggers (rfcs/trigger.md, webhook form, UNSIGNED vendor).
 *
 *   - `onSubscribe` registers a webhook for ONE event with `POST /v1/webhooks` (`name`,
 *     `post_url` = the host's callback URL, `events`) and keeps the webhook id; `onUnsubscribe`
 *     deletes it with `DELETE /v1/webhooks/{id}`, and one Flodesk no longer has counts as deleted.
 *   - Flodesk publishes no signature, secret or signing header for webhooks (its webhook schema has
 *     none), so there is nothing to verify: the per-subscription callback URL IS the secret. This is
 *     stated in the README trust model; no signature scheme is invented here.
 *   - `handleIngest` accepts a POST whose body is a Flodesk event of the trigger's own kind.
 *
 * Docs (verified 2026-11-10): https://developers.flodesk.com/ (Webhook and Webhook Events).
 */

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
}

/** The run's `trigger.event`: one Flodesk subscriber event. */
export interface SubscriberEvent {
  eventName: string;
  eventTime: string | null;
  webhookId: string | null;
  subscriberId: string | null;
  email: string | null;
  subscriber: Record<string, unknown>;
  segment: Record<string, unknown> | null;
}

const OUTPUT: OutputField[] = [
  { key: "eventName", type: "string", label: "Event" },
  { key: "eventTime", type: "string", label: "Event Time" },
  { key: "webhookId", type: "string", label: "Webhook ID" },
  { key: "subscriberId", type: "string", label: "Subscriber ID" },
  { key: "email", type: "string", label: "Subscriber Email" },
  { key: "subscriber", type: "object", label: "Subscriber" },
  { key: "segment", type: "object", label: "Segment (segment events only)" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** A webhook name Flodesk shows in its list, unique to the subscription. */
export function nameFor(subscriptionId: string): string {
  const clean = String(subscriptionId).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60);
  return `w6w-${clean || "sub"}`;
}

/** True for the "no such webhook" answers `FlodeskClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^Flodesk (404|410)\b/.test(err.message);
}

/** The delivery body → its event. Throws on a body that is not a Flodesk subscriber event. */
export function normalizeDelivery(body: unknown): SubscriberEvent {
  const d = asObject(body);
  const eventName = str(d?.event_name);
  const subscriber = asObject(d?.subscriber);
  if (!d || !eventName || !subscriber) {
    throw new Error("Not a Flodesk webhook delivery: expected `event_name` and `subscriber`.");
  }
  return {
    eventName,
    eventTime: str(d.event_time),
    webhookId: str(d.webhook_id),
    subscriberId: str(subscriber.id),
    email: str(subscriber.email),
    subscriber,
    segment: asObject(d.segment),
  };
}

/** The three events Flodesk publishes (https://developers.flodesk.com/, verified 2026-11-10). */
export const EVENT_NAMES = [
  "subscriber.created",
  "subscriber.unsubscribed",
  "subscriber.added_to_segment",
];

/** The user's comma-separated event list (empty = all three) → validated names. */
export function chooseEvents(raw: unknown): string[] {
  const wanted = (typeof raw === "string" ? raw : "").split(",").map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (wanted.length === 0) return [...EVENT_NAMES];
  const bad = wanted.filter((e) => !EVENT_NAMES.includes(e));
  if (bad.length > 0) {
    throw new Error(`Unknown Flodesk event(s): ${bad.join(", ")}. Use ${EVENT_NAMES.join(", ")}.`);
  }
  return [...new Set(wanted)];
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /**
   * The Flodesk event this trigger subscribes to (and keeps). Omit it for the Any-event trigger:
   * it takes an `events` param (empty = all three) and registers exactly that list.
   */
  eventName?: string;
  sample: SubscriberEvent;
}

/** Build one Flodesk subscriber-event webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<{ events?: string }, SubscriberEvent, TriggerState> {
  const chosen = (params: { events?: string } | undefined) =>
    spec.eventName ? [spec.eventName] : chooseEvents(params?.events);
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.eventName ? [] : [{
      key: "events",
      label: "Events",
      type: "string",
      hint: `Comma-separated Flodesk events to fire on: ${
        EVENT_NAMES.join(", ")
      }. Leave empty for all of them.`,
    }],
    output: OUTPUT,
    sample: spec.sample,

    async onSubscribe({ subscriptionId, callbackUrl, params }, ctx: HookContext) {
      const created = await new FlodeskClient(ctx).request<{ id?: unknown }>("/webhooks", {
        method: "POST",
        body: {
          name: nameFor(subscriptionId),
          post_url: callbackUrl,
          events: chosen(params),
        },
      });
      const webhookId = str(created?.id);
      if (!webhookId) throw new Error("Flodesk did not return the id of the webhook it created.");
      return { webhookId };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.webhookId) return;
      try {
        await new FlodeskClient(ctx).request(`/webhooks/${encodeURIComponent(s.webhookId)}`, {
          method: "DELETE",
        });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Flodesk delivers webhooks with POST, not ${raw.method}.`);
      }
      let body: unknown = raw.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          throw new Error("Flodesk delivery refused: the body is not JSON.");
        }
      }
      const event = normalizeDelivery(body);
      // Other events (a webhook can carry several) are acknowledged without a run.
      if (!chosen(params).includes(event.eventName)) return [];
      return [event];
    },
  };
}
