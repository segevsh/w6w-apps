import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { HeartbeatClient } from "./client.ts";

/**
 * Heartbeat webhook triggers (rfcs/trigger.md, webhook form, API-registered, UNSIGNED).
 *
 *   - `onSubscribe` registers the callback URL for one action with `PUT /webhooks`
 *     (`{ action: { name, filter? }, url }`) and keeps the returned webhook id in the state;
 *     `onUnsubscribe` deletes it with `DELETE /webhooks/{id}` (a 404 counts as already gone).
 *   - Heartbeat documents no signature, secret or signing header anywhere in its Webhooks reference,
 *     so there is NOTHING to verify and this kit's signature primitives are deliberately not used
 *     (a signature scheme is never invented). The trust model is the callback URL: the host
 *     issues it per subscription as an unguessable id, and anyone who learns it can post a forged
 *     delivery. `handleIngest` only checks the method and that the body is a JSON object.
 *   - The delivery body is the action's documented payload (id, channelID, ...); the run gets it
 *     flattened beside `action`.
 *
 * Docs (verified 2026-11-10): https://heartbeat.readme.io/reference/webhooks (actions, filters,
 * payloads) and https://heartbeat.readme.io/reference/createwebhook (PUT /webhooks answers `{ id }`)
 */

export interface TriggerParams {
  [key: string]: unknown;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
}

/** The run's `trigger.event`: the action name plus the delivery's payload fields. */
export type HeartbeatEvent = { action: string } & Record<string, unknown>;

export const ACTION_OUTPUT: OutputField = { key: "action", type: "string", label: "Action name" };

/** True for the "no such webhook" answer `HeartbeatClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^Heartbeat 404\b/.test(err.message);
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

/** The delivery body as an object: already parsed by the host, or JSON text. */
export function parseDelivery(raw: { body: unknown; rawBody?: unknown }): Record<string, unknown> {
  let b = raw.body;
  if (typeof b !== "string" && typeof raw.rawBody === "string" && b == null) b = raw.rawBody;
  if (typeof b === "string") {
    try {
      b = JSON.parse(b);
    } catch {
      throw new Error("Not a Heartbeat webhook delivery: the body is not JSON.");
    }
  }
  const obj = asObject(b);
  if (!obj) throw new Error("Not a Heartbeat webhook delivery: expected a JSON object.");
  return obj;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The Heartbeat webhook action name (`USER_JOIN`, `THREAD_CREATE`, ...). */
  action: string;
  /** Filter params the user fills in; their values reach `filter`. */
  params?: Param[];
  /** Build the registration filter from the params; throw when a required one is missing. */
  filter?(params: TriggerParams): Record<string, unknown> | undefined;
  /** The documented payload fields (the `action` field is added). */
  output: OutputField[];
  sample: HeartbeatEvent;
}

/** A required string param, trimmed; throws a clear message when absent. */
export function requireParam(params: TriggerParams, key: string, label: string): string {
  const v = params[key];
  if (typeof v !== "string" || v.trim() === "") throw new Error(`Set the ${label} to watch.`);
  return v.trim();
}

/** Build one Heartbeat action webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, HeartbeatEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params ?? [],
    output: [ACTION_OUTPUT, ...spec.output],
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const filter = spec.filter?.(params ?? {});
      const action = filter && Object.keys(filter).length > 0
        ? { name: spec.action, filter }
        : { name: spec.action };
      const made = await new HeartbeatClient(ctx).json<{ id?: unknown }>("/webhooks", {
        method: "PUT",
        body: { action, url: callbackUrl },
      });
      if (typeof made?.id !== "string" || made.id === "") {
        throw new Error(
          "Heartbeat did not return a webhook id, so the webhook cannot be removed later.",
        );
      }
      return { webhookId: made.id };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.webhookId) return;
      try {
        await new HeartbeatClient(ctx).json(`/webhooks/${encodeURIComponent(s.webhookId)}`, {
          method: "DELETE",
        });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    handleIngest({ raw }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Heartbeat delivers webhooks with POST, not ${raw.method}.`);
      }
      return [{ action: spec.action, ...parseDelivery(raw) }];
    },
  };
}
