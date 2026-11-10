import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import {
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { CopperClient } from "./client.ts";

/**
 * Copper webhook triggers (rfcs/trigger.md, webhook form) on `/developer_api/v1/webhooks`.
 *
 *   - `onSubscribe` generates a random secret (D5 (1): the subscription's optional `secret`
 *     object is caller-chosen "arbitrary data … to authenticate the request"), deletes any
 *     subscription already pointed at the host's `callbackUrl`, then creates one for the trigger's
 *     entity type and event. The secret is kept in the subscription state.
 *   - `onUnsubscribe` deletes the subscription; one Copper no longer has counts as deleted.
 *   - `handleIngest` reads the raw body, requires the stored secret to exist, and refuses any
 *     delivery whose `w6w_secret` field differs (constant-time compare). Copper copies each key of
 *     the `secret` object into the top level of the delivery body; it is a shared secret, not an
 *     HMAC. The secret is removed from the emitted events.
 *
 * A notification carries only record ids (up to 30), never the records: one event per id.
 * Copper does not retry notifications.
 */

export type CopperEntity = "person" | "lead" | "company" | "opportunity" | "task";
export type CopperEvent = "new" | "update" | "delete";

/** The key under which this trigger's secret rides in the subscription's `secret` object. */
export const SECRET_FIELD = "w6w_secret";

export type TriggerParams = Record<string, never>;

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  secret: string;
  type: CopperEntity;
  event: CopperEvent;
}

/** One record named by a notification. */
export interface CopperRecordEvent {
  id: number;
  type: string;
  event: string;
  subscriptionId: number | null;
  timestamp: string | null;
  updatedAttributes: Record<string, unknown> | null;
}

export const EVENT_OUTPUT: OutputField[] = [
  { key: "id", type: "number", label: "Record ID" },
  { key: "type", type: "string", label: "Record type" },
  { key: "event", type: "string", label: "Event (new, update, delete)" },
  { key: "subscriptionId", type: "number", label: "Subscription ID" },
  { key: "timestamp", type: "string", label: "Event time (ISO 8601)" },
  { key: "updatedAttributes", type: "object", label: "Changed fields as [old, new] (updates)" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

export async function deleteSubscription(client: CopperClient, id: string): Promise<void> {
  try {
    await client.request(`/webhooks/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (err) {
    if (/^Copper (404|410) /.test(String((err as Error)?.message))) return;
    throw err;
  }
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  type: CopperEntity;
  event: CopperEvent;
  sample: CopperRecordEvent;
}

/** Build one Copper webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, CopperRecordEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [],
    output: EVENT_OUTPUT,
    sample: spec.sample,

    async onSubscribe({ callbackUrl }, ctx: HookContext) {
      const client = new CopperClient(ctx);
      const listed = await client.request<Array<{ id?: unknown; target?: unknown }>>("/webhooks");
      for (const w of Array.isArray(listed) ? listed : []) {
        const id = str(w.id);
        if (id && w.target === callbackUrl) await deleteSubscription(client, id);
      }
      const secret = randomSecret();
      const created = await client.request<{ id?: unknown }>("/webhooks", {
        method: "POST",
        body: {
          target: callbackUrl,
          type: spec.type,
          event: spec.event,
          secret: { [SECRET_FIELD]: secret },
        },
      });
      const webhookId = str(created?.id);
      if (!webhookId) throw new Error("Copper created the subscription but returned no id.");
      return { webhookId, secret, type: spec.type, event: spec.event };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      if (state?.webhookId) await deleteSubscription(new CopperClient(ctx), state.webhookId);
    },

    handleIngest({ raw, state }) {
      const delivery = verifiedDelivery(raw, state?.secret);
      if (delivery.type !== spec.type || delivery.event !== spec.event) return [];
      return recordEvents(delivery);
    },
  };
}

/**
 * Verify one Copper delivery against the stored secret and return its parsed body. The secret is
 * required before any compare (an unset secret can never equal an absent field); the body is the
 * raw text, never re-serialised.
 */
export function verifiedDelivery(
  raw: { rawBody?: unknown },
  storedSecret: unknown,
): Record<string, unknown> {
  const expected = requireSecret(storedSecret);
  const body = requireRawBody(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("Copper delivery refused: the body is not JSON.");
  }
  const delivery = asObject(parsed);
  if (!delivery || !timingSafeEqual(delivery[SECRET_FIELD] as string, expected)) {
    throw new Error("Copper delivery refused: the secret does not match.");
  }
  return delivery;
}

/** One event per record id named by a verified delivery. */
export function recordEvents(delivery: Record<string, unknown>): CopperRecordEvent[] {
  const ids = Array.isArray(delivery.ids) ? delivery.ids.filter((i) => num(i) !== null) : [];
  return (ids as number[]).map((id) => ({
    id,
    type: String(delivery.type),
    event: String(delivery.event),
    subscriptionId: num(delivery.subscription_id),
    timestamp: str(delivery.timestamp),
    updatedAttributes: asObject(delivery.updated_attributes),
  }));
}
