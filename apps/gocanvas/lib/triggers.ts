import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { encodeId, GoCanvasClient } from "./client.ts";
import { WEBHOOK_EVENTS } from "./params.ts";
import { pollWindow } from "./window.ts";

/**
 * GoCanvas webhook triggers (rfcs/trigger.md, webhook form, API-registered, UNSIGNED).
 *
 *   - `onSubscribe` registers the callback URL for one event type: `POST /forms/{id}/webhooks`
 *     for a form (a form can hold only ONE webhook per event type, so a second subscription to the
 *     same form and event is refused by GoCanvas with its own message), or `POST /webhooks` for a
 *     company-wide webhook when no form is named (account administrators only). The body is
 *     `{ event_type, format: "json", push_url, push_tag }`. The webhook id goes into the state.
 *   - `onUnsubscribe` deletes it (soft delete, which frees the one-per-event slot); GoCanvas answers
 *     404 for a webhook that is already deleted, which counts as gone.
 *   - GoCanvas documents no signature, secret or signing header for webhooks, so there is NOTHING to
 *     verify and none is invented. The trust model is the callback URL: the host issues it per
 *     subscription as an unguessable id; anyone who learns it can post a forged delivery.
 *   - The API reference lists the event types but not the delivery body ("a payload containing some
 *     metadata about the event"; the help-centre article that may describe it is not reachable
 *     without a browser), so the parsed body is passed through whole as `payload`.
 *
 *   - `anyEventTrigger` registers one webhook per selected event type (GoCanvas takes exactly one
 *     `event_type` per webhook and has no "all events" value), tagging each `push_url` with
 *     `?event=<type>` so a delivery names its event even though the delivery body is undocumented.
 *   - `snapshotTrigger` is the poll form: a small, unordered, unfiltered collection is read whole
 *     (every page, through the SAME list action the app ships) and diffed by id with `pollSnapshot`.
 *
 * Docs (verified 2026-11-10): https://api.gocanvas.com/api/v3/docs (Webhooks and Company-wide
 * Webhooks sections; Pagination)
 */

export interface TriggerParams {
  formId?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  /** The form the webhook is on, or null for a company-wide webhook. */
  formId: string | null;
  webhookId: string;
}

/** The run's `trigger.event`: one GoCanvas webhook delivery. */
export interface GoCanvasEvent {
  eventType: string;
  formId: string | null;
  payload: Record<string, unknown>;
}

const FORM_PARAM: Param = {
  key: "formId",
  label: "Form ID",
  type: "string",
  hint:
    "The form to watch (Get Many Forms lists the ids). Leave empty for a company-wide webhook that covers every form; that needs an account administrator. A form can hold only one webhook per event.",
};

export const OUTPUT: OutputField[] = [
  { key: "eventType", type: "string", label: "Event type" },
  { key: "formId", type: "string", label: "Form ID (empty for a company-wide webhook)" },
  { key: "payload", type: "object", label: "Full webhook payload" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

/** True for the "no such webhook" answer `GoCanvasClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^GoCanvas 404\b/.test(err.message);
}

const hookPath = (formId: string | null, id?: string) =>
  `${formId ? `/forms/${encodeId(formId)}` : ""}/webhooks${id ? `/${encodeId(id)}` : ""}`;

/** The delivery body as an object: already parsed by the host, or JSON text. */
export function parseDelivery(raw: { body: unknown; rawBody?: unknown }): Record<string, unknown> {
  let b = raw.body;
  if (b == null && typeof raw.rawBody === "string") b = raw.rawBody;
  if (typeof b === "string") {
    try {
      b = JSON.parse(b);
    } catch {
      throw new Error("Not a GoCanvas webhook delivery: the body is not JSON.");
    }
  }
  const obj = asObject(b);
  if (!obj) throw new Error("Not a GoCanvas webhook delivery: expected a JSON object.");
  return obj;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The GoCanvas `event_type` this trigger registers for. */
  eventType: string;
  sample: GoCanvasEvent;
}

/** Build one GoCanvas event webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, GoCanvasEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [FORM_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const formId = params?.formId?.toString().trim() || null;
      const made = await new GoCanvasClient(ctx).request<{ id?: unknown }>(hookPath(formId), {
        method: "POST",
        body: {
          event_type: spec.eventType,
          format: "json",
          push_url: callbackUrl,
          push_tag: "w6w",
        },
      });
      const id = typeof made?.id === "number" || typeof made?.id === "string"
        ? String(made.id)
        : "";
      if (id === "") {
        throw new Error(
          "GoCanvas did not return a webhook id, so the webhook cannot be removed later.",
        );
      }
      return { formId, webhookId: id };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.webhookId) return;
      try {
        await new GoCanvasClient(ctx).request(hookPath(s.formId ?? null, s.webhookId), {
          method: "DELETE",
        });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`GoCanvas delivers webhooks with POST, not ${raw.method}.`);
      }
      const formId = (state as Partial<TriggerState> | undefined)?.formId ?? null;
      return [{ eventType: spec.eventType, formId, payload: parseDelivery(raw) }];
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Any-event webhook trigger
// ---------------------------------------------------------------------------------------------

type EventName = typeof WEBHOOK_EVENTS[number];

/**
 * Events GoCanvas refuses to register on a form that lacks the feature (Dispatch, Workflow,
 * Submission Statuses): "In order to create dispatch_create (event_type) Webhook, Dispatch has to
 * be enabled on the Form" and likewise for the other two.
 */
const FEATURE_GATED: ReadonlySet<string> = new Set([
  "dispatch_create",
  "workflow_handoff_create",
  "submission_custom_status_change",
]);

/**
 * The statuses a refusal for a missing form feature may come with. GoCanvas documents the refusal's
 * wording but not its status, so only the validation class (400, 422) counts: a 401/403 (no admin
 * rights), 404, 409 (the form's one webhook for that event is taken) or 429 (rate limit) is never
 * "the form lacks the feature", and fails the subscription instead.
 */
const GATE_STATUSES: ReadonlySet<number> = new Set([400, 422]);

export interface AnyEventParams {
  formId?: string;
  events?: string;
}

export interface AnyEventState {
  formId: string | null;
  /** One GoCanvas webhook per registered event type. */
  webhooks: Array<{ eventType: string; id: string }>;
}

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  hint: `Comma-separated GoCanvas event names (${
    WEBHOOK_EVENTS.join(", ")
  }). Leave empty for all five: on a form without Dispatch, Workflow or Submission Statuses enabled, GoCanvas refuses those events and they are skipped. Name an event explicitly and a refusal fails the subscription instead. A form holds one webhook per event, so an event already used by another trigger on the same form is refused.`,
};

/** `"submission_create, dispatch_create"` -> validated, de-duplicated event names; empty -> []. */
export function parseEvents(v: unknown): EventName[] {
  const names = String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const out: EventName[] = [];
  for (const n of names) {
    if (!(WEBHOOK_EVENTS as readonly string[]).includes(n)) {
      throw new Error(
        `Unknown GoCanvas event "${n}"; the event types are ${WEBHOOK_EVENTS.join(", ")}.`,
      );
    }
    if (!out.includes(n as EventName)) out.push(n as EventName);
  }
  return out;
}

/** The callback URL with `event=<type>` added, so a delivery says which webhook sent it. */
export function pushUrlFor(callbackUrl: string, eventType: string): string {
  try {
    const u = new URL(callbackUrl);
    u.searchParams.set("event", eventType);
    return u.toString();
  } catch {
    return callbackUrl;
  }
}

const statusOf = (err: unknown): number | null => {
  const m = err instanceof Error ? /^GoCanvas (\d{3})\b/.exec(err.message) : null;
  return m ? Number(m[1]) : null;
};

async function deleteWebhook(client: GoCanvasClient, formId: string | null, id: string) {
  try {
    await client.request(hookPath(formId, id), { method: "DELETE" });
  } catch (err) {
    if (!isGone(err)) throw err;
  }
}

/** The "Any Event" trigger: one webhook per selected GoCanvas event, one filter over deliveries. */
export function anyEventTrigger(
  spec: { key: string; title: string; description: string; sample: GoCanvasEvent },
): TriggerDefinition<AnyEventParams, GoCanvasEvent, AnyEventState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [FORM_PARAM, EVENTS_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const formId = params?.formId?.toString().trim() || null;
      const named = parseEvents(params?.events);
      const explicit = named.length > 0;
      const client = new GoCanvasClient(ctx);
      const made: AnyEventState["webhooks"] = [];
      for (const eventType of explicit ? named : WEBHOOK_EVENTS) {
        try {
          const res = await client.request<{ id?: unknown }>(hookPath(formId), {
            method: "POST",
            body: {
              event_type: eventType,
              format: "json",
              push_url: pushUrlFor(callbackUrl, eventType),
              push_tag: "w6w",
            },
          });
          const id = typeof res?.id === "number" || typeof res?.id === "string"
            ? String(res.id)
            : "";
          if (id === "") {
            throw new Error(
              "GoCanvas did not return a webhook id, so the webhook cannot be removed later.",
            );
          }
          made.push({ eventType, id });
        } catch (err) {
          const st = statusOf(err);
          if (!explicit && FEATURE_GATED.has(eventType) && st !== null && GATE_STATUSES.has(st)) {
            // The form does not have that feature: nothing to subscribe to. Say so.
            ctx.log?.("warn", `GoCanvas refused ${eventType} on this form; skipped`, {
              status: st,
            });
            continue;
          }
          for (const w of made) await deleteWebhook(client, formId, w.id).catch(() => {});
          throw err;
        }
      }
      return { formId, webhooks: made };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<AnyEventState> | undefined;
      if (!s?.webhooks?.length) return;
      const client = new GoCanvasClient(ctx);
      let failure: unknown;
      for (const w of s.webhooks) {
        try {
          await deleteWebhook(client, s.formId ?? null, w.id);
        } catch (err) {
          failure ??= err;
        }
      }
      if (failure) throw failure;
    },

    handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`GoCanvas delivers webhooks with POST, not ${raw.method}.`);
      }
      const s = state as Partial<AnyEventState> | undefined;
      const registered = (s?.webhooks ?? []).map((w) => w.eventType);
      const payload = parseDelivery(raw);
      const fromQuery = raw.query?.event;
      const fromBody = payload.type;
      let eventType = typeof fromQuery === "string" && fromQuery !== ""
        ? fromQuery
        : typeof fromBody === "string"
        ? fromBody
        : "";
      if (eventType === "" && registered.length === 1) eventType = registered[0];
      if (eventType === "") {
        throw new Error("Cannot tell which GoCanvas event this delivery is for.");
      }
      // The event filter: only the events the subscription asked for are delivered.
      if (!registered.includes(eventType)) return [];
      return [{ eventType, formId: s?.formId ?? null, payload }];
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Snapshot poll triggers
// ---------------------------------------------------------------------------------------------

/** GoCanvas pages of 100 by default (Pagination), so 50 pages is the kit's 5000-row cap. */
export const SNAPSHOT_MAX_PAGES = 50;

/** An app list action, called the way the action itself is called. */
interface ListAction {
  execute(input: never, ctx: HookContext): unknown;
}

export interface SnapshotSpec {
  key: string;
  title: string;
  description: string;
  params?: Param[];
  action: ListAction;
  /** The list action's input for the trigger's params (no `page`). */
  input?(params: Record<string, unknown>): Record<string, unknown>;
  /** True when the action takes `page` and answers `{ items, pagination }`. */
  paged: boolean;
  idOf(item: unknown): string;
  output: OutputField[];
  sample: unknown;
  minIntervalMs?: number;
}

function rowsOf(result: unknown): unknown[] {
  if (Array.isArray(result)) return result;
  const o = asObject(result);
  const rows = o?.items ?? o?.data;
  return Array.isArray(rows) ? rows : [];
}

/**
 * "New <record>" over a small collection GoCanvas returns whole and unordered (no sort or
 * created-since filter is documented for it): read every page through the list action, diff the
 * ids with `pollSnapshot` (added only), emit the new records. A collection above 5000 rows throws
 * naming the cap, as the kit does.
 */
export function snapshotTrigger(spec: SnapshotSpec): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    minIntervalMs: spec.minIntervalMs ?? 600_000,
    output: spec.output,
    sample: spec.sample,
    async poll({ params, state }, ctx) {
      const base = spec.input?.(params ?? {}) ?? {};
      const run = spec.action.execute as (i: Record<string, unknown>, c: HookContext) => unknown;
      const items = new Map<string, unknown>();
      let page: number | null = 1;
      for (let n = 0; page !== null; n++) {
        if (n >= SNAPSHOT_MAX_PAGES) {
          throw new Error(
            `${spec.key}: more than ${SNAPSHOT_MAX_PAGES} pages (5000 rows); the collection is too large to snapshot`,
          );
        }
        const result = await run(spec.paged ? { ...base, page } : base, ctx);
        for (const item of rowsOf(result)) {
          const id = spec.idOf(item);
          if (id !== "" && !items.has(id)) items.set(id, item);
        }
        const next: unknown = spec.paged ? asObject(asObject(result)?.pagination)?.nextPage : null;
        page = typeof next === "number" ? next : null;
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...items.keys()].map((key) => ({ key, values: { id: key } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => items.get(e.key)), nextState };
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Since-filter poll triggers (created_at window)
// ---------------------------------------------------------------------------------------------

/** Test seam: the clock the since-filter triggers read. */
export const clock = { now: (): number => Date.now() };

/** Pages one check reads of a window; a longer window resumes on the next check (brief 9.8). */
export const SINCE_MAX_PAGES = 5;
/** GoCanvas answers 100 rows per page by default (Pagination). */
const SINCE_PAGE_SIZE = 100;
/** Each window starts this far before the cursor; the overlap is de-duplicated by id. */
const SINCE_OVERLAP_MS = 300_000;

/** `2026-11-10T11:55:00Z` — whole seconds, an ISO-8601 shape the docs' date filters accept. */
const isoSeconds = (ms: number): string => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");

export interface SinceSpec {
  key: string;
  title: string;
  description: string;
  params: Param[];
  /** The list action, called with `page`, `startDate` (and `endDate` on continuation pages). */
  action: ListAction;
  /** The list action's input for the trigger's params, without `page`, `startDate`, `endDate`. */
  input(params: Record<string, unknown>): Record<string, unknown>;
  idOf(item: unknown): string;
  output: OutputField[];
  sample: unknown;
}

/**
 * "New <record>" over a list GoCanvas can filter by `start_date`/`end_date` on the record's
 * `created_at` (documented for submissions and dispatches; no sort order is documented): each
 * check reads `start_date = cursor - 5 min` through the SAME list action, a window longer than
 * five pages resumes at its next page on the following check, and the seed stores a floor so no
 * record that existed before the first check is ever emitted (brief 9.8, 9.9).
 */
export function sinceTrigger(spec: SinceSpec): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    minIntervalMs: 300_000,
    output: spec.output,
    sample: spec.sample,
    async poll({ params, state }, ctx) {
      const base = spec.input(params ?? {}); // refuses a missing parent id before any request
      const run = spec.action.execute as (i: Record<string, unknown>, c: HookContext) => unknown;
      return await pollWindow<Record<string, unknown>, number>({
        state,
        now: clock.now(),
        overlapMs: SINCE_OVERLAP_MS,
        maxPages: SINCE_MAX_PAGES,
        pageSize: SINCE_PAGE_SIZE,
        seenWindow: 2000,
        idOf: (item) => spec.idOf(item),
        tsOf: (item) => {
          const t = typeof item.created_at === "string" ? Date.parse(item.created_at) : NaN;
          return Number.isNaN(t) ? undefined : t;
        },
        async load(since, pos, until) {
          const result = await run({
            ...base,
            page: pos ?? 1,
            startDate: isoSeconds(since),
            // A continuation page is bounded by the moment the window started, so records that
            // arrive while it drains cannot shift the page positions; the next window reads them.
            ...(pos === undefined ? {} : { endDate: isoSeconds(until) }),
          }, ctx);
          const o = asObject(result);
          const next = asObject(o?.pagination)?.nextPage;
          return {
            // An item without an id cannot be de-duplicated, so it is skipped, never keyed "".
            items: rowsOf(result).filter((x): x is Record<string, unknown> =>
              asObject(x) !== null && spec.idOf(x) !== ""
            ),
            next: typeof next === "number" ? next : undefined,
          };
        },
      });
    },
  };
}

/** A required numeric id given as a `string` param (the picker passes text). */
export function requiredId(params: Record<string, unknown>, key: string, label: string): number {
  const raw = String(params?.[key] ?? "").trim();
  const n = Number(raw);
  if (raw === "" || !Number.isInteger(n)) {
    throw new Error(`${label} is required and must be a number`);
  }
  return n;
}
