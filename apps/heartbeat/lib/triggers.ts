import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
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

/** The query key the Any Event trigger appends to its callback URL to say which action fired. */
export const EVENT_QUERY_KEY = "hbEvent";

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

/** Heartbeat webhook actions the Any Event trigger can register, and the filter each one needs. */
const ANY_EVENT_ACTIONS: ReadonlyArray<{
  name: string;
  /** The Any Event param that supplies this action's REQUIRED filter (none: registers bare). */
  needs?: { param: string; filterKey: string; label: string };
}> = [
  { name: "USER_JOIN" },
  { name: "USER_UPDATE" },
  { name: "EVENT_CREATE" },
  { name: "EVENT_RSVP" },
  { name: "DOCUMENT_CREATE" },
  { name: "ABANDONED_CART" },
  {
    name: "THREAD_CREATE",
    needs: { param: "channelId", filterKey: "channelID", label: "channel ID" },
  },
  { name: "GROUP_JOIN", needs: { param: "groupId", filterKey: "groupID", label: "group ID" } },
  {
    name: "COURSE_COMPLETED",
    needs: { param: "courseId", filterKey: "courseID", label: "course ID" },
  },
  {
    name: "DIRECT_MESSAGE",
    needs: { param: "userId", filterKey: "userID", label: "admin user ID" },
  },
];

/** What the Any Event trigger's `onSubscribe` returns: every webhook it registered. */
export interface AnyEventState {
  webhookIds: string[];
  events: string[];
}

/**
 * The (action, filter) pairs an Any Event subscription registers. `events` is a comma-separated
 * list of Heartbeat action names; empty means every action that needs no filter plus every
 * filtered action whose id field is filled in. Throws before any request on an unknown action
 * (`MENTION` included: it needs a user selection, use the Mention trigger) or a missing filter.
 */
export function anyEventPlan(
  params: TriggerParams,
): Array<{ name: string; filter?: Record<string, unknown> }> {
  const text = typeof params.events === "string" ? params.events : "";
  const wanted = text.split(",").map((e) => e.trim().toUpperCase()).filter((e) => e !== "");
  const value = (key: string): string | undefined => {
    const v = params[key];
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  };
  const known = new Map(ANY_EVENT_ACTIONS.map((a) => [a.name, a]));
  const chosen = wanted.length > 0
    ? [...new Set(wanted)].map((name) => {
      const a = known.get(name);
      if (!a) {
        throw new Error(
          `Unknown Heartbeat event "${name}". Use: ${
            ANY_EVENT_ACTIONS.map((x) => x.name).join(", ")
          } (MENTION has its own trigger).`,
        );
      }
      return a;
    })
    : ANY_EVENT_ACTIONS.filter((a) => !a.needs || value(a.needs.param) !== undefined);
  return chosen.map((a) => {
    if (!a.needs) return { name: a.name };
    const v = value(a.needs.param);
    if (v === undefined) throw new Error(`${a.name} needs the ${a.needs.label} to watch.`);
    return { name: a.name, filter: { [a.needs.filterKey]: v } };
  });
}

/** The callback URL for one registered action: the host URL plus `?hbEvent=<ACTION>`. */
export function eventCallbackUrl(callbackUrl: string, action: string): string {
  const u = new URL(callbackUrl);
  u.searchParams.set(EVENT_QUERY_KEY, action);
  return u.toString();
}

async function registerWebhook(
  ctx: HookContext,
  action: { name: string; filter?: Record<string, unknown> },
  url: string,
): Promise<string> {
  const made = await new HeartbeatClient(ctx).json<{ id?: unknown }>("/webhooks", {
    method: "PUT",
    body: { action, url },
  });
  if (typeof made?.id !== "string" || made.id === "") {
    throw new Error(
      "Heartbeat did not return a webhook id, so the webhook cannot be removed later.",
    );
  }
  return made.id;
}

async function deleteWebhook(ctx: HookContext, id: string): Promise<void> {
  try {
    await new HeartbeatClient(ctx).json(`/webhooks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  } catch (err) {
    if (!isGone(err)) throw err;
  }
}

/**
 * The Any Event trigger. Heartbeat registers one action per webhook and has no "all", so
 * `onSubscribe` registers one webhook per chosen action, each on the callback URL plus
 * `?hbEvent=<ACTION>` (the delivery body never names its action). `handleIngest` accepts only an
 * action this subscription registered. UNSIGNED like every Heartbeat webhook: the URL is the secret.
 */
export function anyEventTrigger(spec: {
  key: string;
  title: string;
  description: string;
  params: Param[];
  output: OutputField[];
  sample: HeartbeatEvent;
}): TriggerDefinition<TriggerParams, HeartbeatEvent, AnyEventState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: [ACTION_OUTPUT, ...spec.output],
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const plan = anyEventPlan(params ?? {});
      const webhookIds: string[] = [];
      try {
        for (const action of plan) {
          webhookIds.push(
            await registerWebhook(ctx, action, eventCallbackUrl(callbackUrl, action.name)),
          );
        }
      } catch (err) {
        // Leave nothing half-registered: remove what was created, then report the failure.
        for (const id of webhookIds) await deleteWebhook(ctx, id).catch(() => undefined);
        throw err;
      }
      return { webhookIds, events: plan.map((a) => a.name) };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const ids = (state as Partial<AnyEventState> | undefined)?.webhookIds ?? [];
      let failure: unknown;
      for (const id of ids) {
        try {
          await deleteWebhook(ctx, id);
        } catch (err) {
          failure ??= err;
        }
      }
      if (failure) throw failure;
    },

    handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Heartbeat delivers webhooks with POST, not ${raw.method}.`);
      }
      const action = raw.query?.[EVENT_QUERY_KEY];
      const registered = (state as Partial<AnyEventState> | undefined)?.events ?? [];
      if (typeof action !== "string" || !registered.includes(action)) {
        throw new Error("Not a Heartbeat delivery this subscription registered.");
      }
      return [{ action, ...parseDelivery(raw) }];
    },
  };
}

/** The creation stamp ordering used by `newestFirst`; NaN when absent/unparseable. */
function createdAtMs(item: unknown): number {
  const v = asObject(item)?.createdAt;
  return typeof v === "string" ? Date.parse(v) : NaN;
}

/**
 * Newest-first by `createdAt` when EVERY item carries a parseable one (Heartbeat does not document
 * the order of a direct chat's "100 most recent" messages, so sort explicitly); otherwise the
 * array is returned as it came.
 */
export function newestFirst<T>(items: T[]): T[] {
  if (items.length === 0 || items.some((i) => Number.isNaN(createdAtMs(i)))) return items;
  return [...items].sort((a, b) => createdAtMs(b) - createdAtMs(a));
}

/** Items of `result[field]` when it is an array, else none. */
export function listOf(result: unknown, field: string): unknown[] {
  const v = asObject(result)?.[field];
  return Array.isArray(v) ? v : [];
}

/** The string `id` of a record, or "". */
export function idOf(item: unknown): string {
  const v = asObject(item)?.id;
  return typeof v === "string" ? v : "";
}

/**
 * A "New <record>" poll over a small bounded collection that Heartbeat returns whole, in one
 * unpaged, unordered response (`pollSnapshot`, added rows only). It calls the SAME action as the
 * action's own tests exercise, so the request and auth are the action's. Rows without a string
 * `id` are ignored. More than the kit's 5000 rows throws an Error naming the cap.
 */
export function snapshotTrigger<I>(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<I>;
  /** The action's list field in its result (`channels`, `groups`, ...). */
  field: string;
  output: OutputField[];
  sample: Record<string, unknown>;
  minIntervalMs?: number;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [],
    minIntervalMs: spec.minIntervalMs ?? 300_000,
    output: spec.output,
    sample: spec.sample,
    async poll({ state }, ctx) {
      const result = await spec.action.execute({} as I, ctx);
      const list = asObject(result)?.[spec.field];
      // A 200 with an empty or odd body must not read as "no rows": that would reset the
      // snapshot baseline and the next good answer would re-emit every row.
      if (!Array.isArray(list)) {
        throw new Error(`Heartbeat answered without a list in "${spec.field}"; try again later.`);
      }
      const rows = list
        .filter((item) => idOf(item) !== "")
        .map((item) => ({ key: idOf(item), values: item }));
      const { events, nextState } = await pollSnapshot({
        state,
        rows,
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
