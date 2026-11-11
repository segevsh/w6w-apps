import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { OnfleetClient } from "./client.ts";

/**
 * Onfleet webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` deletes any webhook already pointed at the host's `callbackUrl` (a leftover
 *     of an attempt that never recorded its id), then `POST /webhooks` with the chosen trigger id.
 *     Onfleet validates the URL BEFORE registering it: it sends `GET <url>?check=<random>` and
 *     wants the string back with HTTP 200 (204 is refused). That GET reaches `handleIngest`.
 *   - `onUnsubscribe` deletes the webhook; one Onfleet no longer has counts as deleted.
 *   - `handleIngest` verifies `X-Onfleet-Signature` — the lowercase-hex HMAC-SHA512 of the raw
 *     request body, keyed by the bytes of the organization's hex webhook secret — before it parses
 *     anything. The secret is the account-wide one from the Onfleet dashboard (Configuration →
 *     API & Webhook → Show Secret), so the user pastes it as the `signingSecret` parameter.
 *
 * The kit's `hmac` helper covers SHA-256/SHA-1 only; SHA-512 uses `crypto.subtle` here directly.
 */

/** Onfleet trigger ids this app registers for (docs.onfleet.com/reference/webhooks). */
export type OnfleetTriggerId = number;

export interface TriggerParams {
  signingSecret?: string;
  /** Seconds (eta, delayed) or meters (arrival); only the threshold triggers declare it. */
  threshold?: number;
  /** Any-event only: comma-separated Onfleet trigger names or ids; empty = every unthresholded event. */
  events?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  trigger: OnfleetTriggerId;
}

/** One delivery, normalized. */
export interface OnfleetEvent {
  triggerId: number;
  triggerName: string | null;
  time: number | null;
  taskId: string | null;
  workerId: string | null;
  adminId: string | null;
  task: Record<string, unknown> | null;
  worker: Record<string, unknown> | null;
  /** Present only on the triggers added in round 3 (they carry the whole delivery). */
  data?: Record<string, unknown> | null;
  status?: number | null;
  etaSeconds?: number | null;
  distance?: number | null;
  delay?: number | null;
  from?: string | null;
  to?: string | null;
  body?: string | null;
  recipient?: Record<string, unknown> | null;
  routePlanId?: string | null;
  dispatchId?: string | null;
  actionContext?: Record<string, unknown> | null;
  delivery?: Record<string, unknown>;
}

const SIGNING_SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "Webhook secret",
  type: "secret",
  required: true,
  hint:
    "Onfleet dashboard → Configuration → API & Webhook → Show Secret (a hexadecimal string). Used to verify every delivery.",
};

export const EVENT_OUTPUT: OutputField[] = [
  { key: "triggerId", type: "number", label: "Trigger ID" },
  { key: "triggerName", type: "string", label: "Trigger name" },
  { key: "time", type: "number", label: "Time (Unix ms)" },
  { key: "taskId", type: "string", label: "Task ID" },
  { key: "workerId", type: "string", label: "Worker ID" },
  { key: "adminId", type: "string", label: "Admin ID" },
  { key: "task", type: "object", label: "Task" },
  { key: "worker", type: "object", label: "Worker" },
];

/** Round-3 triggers: the base fields plus whatever else the trigger's "Includes" column lists. */
export const EXTENDED_OUTPUT: OutputField[] = [
  ...EVENT_OUTPUT,
  { key: "data", type: "object", label: "Data (full object the delivery carries)" },
  { key: "status", type: "number", label: "Status (workerDuty: 0 off duty, 1 on duty)" },
  { key: "etaSeconds", type: "number", label: "ETA threshold reached (seconds)" },
  { key: "distance", type: "number", label: "Distance threshold reached (meters)" },
  { key: "delay", type: "number", label: "Delay (seconds)" },
  { key: "from", type: "string", label: "SMS from" },
  { key: "to", type: "string", label: "SMS to" },
  { key: "body", type: "string", label: "SMS body" },
  { key: "recipient", type: "object", label: "Recipient" },
  { key: "routePlanId", type: "string", label: "Route plan ID" },
  { key: "dispatchId", type: "string", label: "Dispatch ID" },
  { key: "actionContext", type: "object", label: "Action context (who did it)" },
  { key: "delivery", type: "object", label: "The whole delivery, as Onfleet sent it" },
];

const CHECK_PATTERN = /^[\x21-\x7e]{1,256}$/;

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

/** The webhook secret's bytes. Throws (naming nothing) unless it is non-empty even-length hex. */
function secretBytes(secret: string): Uint8Array<ArrayBuffer> {
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(secret)) {
    throw new Error("The Onfleet webhook secret must be a hexadecimal string.");
  }
  const out = new Uint8Array(new ArrayBuffer(secret.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(secret.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function hmacSha512Hex(key: Uint8Array<ArrayBuffer>, data: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-512" }, false, [
    "sign",
  ]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data)));
  let out = "";
  for (const b of sig) out += b.toString(16).padStart(2, "0");
  return out;
}

async function deleteWebhook(client: OnfleetClient, id: string): Promise<void> {
  try {
    await client.request(`/webhooks/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (err) {
    if (/Onfleet (404|410) /.test(String((err as Error)?.message))) return;
    throw err;
  }
}

async function leftovers(client: OnfleetClient, callbackUrl: string): Promise<string[]> {
  const listed = await client.request<Array<{ id?: unknown; url?: unknown }>>("/webhooks");
  return (Array.isArray(listed) ? listed : [])
    .filter((w) => w.url === callbackUrl && typeof w.id === "string")
    .map((w) => w.id as string);
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  trigger: OnfleetTriggerId;
  triggerName: string;
  sample: OnfleetEvent;
  /** Round-3 triggers: the event also carries `data`, `status`, `delay`, … (EXTENDED_OUTPUT). */
  extended?: boolean;
  /** Triggers 1, 2 and 12 fire on a threshold the user chooses; it is sent when registering. */
  threshold?: "seconds" | "meters";
}

type Ingest<S> = NonNullable<
  TriggerDefinition<TriggerParams, OnfleetEvent, S>["handleIngest"]
>;

/** Everything a delivery adds beyond the task/worker the first six triggers expose. */
function normalize(delivery: Record<string, unknown>, extended: boolean): OnfleetEvent {
  const data = asObject(delivery.data);
  const base: OnfleetEvent = {
    triggerId: delivery.triggerId as number,
    triggerName: str(delivery.triggerName),
    time: typeof delivery.time === "number" ? delivery.time : null,
    taskId: str(delivery.taskId),
    workerId: str(delivery.workerId),
    adminId: str(delivery.adminId),
    task: asObject(data?.task),
    worker: asObject(data?.worker),
  };
  if (!extended) return base;
  const num = (v: unknown) => typeof v === "number" ? v : null;
  return {
    ...base,
    data,
    status: num(delivery.status),
    etaSeconds: num(delivery.etaSeconds),
    distance: num(delivery.distance),
    delay: num(delivery.delay),
    from: str(delivery.from),
    to: str(delivery.to),
    body: str(delivery.body),
    recipient: asObject(delivery.recipient),
    routePlanId: str(delivery.routePlanId),
    dispatchId: str(delivery.dispatchId),
    actionContext: asObject(delivery.actionContext),
    delivery,
  };
}

/**
 * The shared receive path: answer the `?check=` handshake, otherwise verify the HMAC over the raw
 * body BEFORE parsing, then hand a verified delivery to `accept` (which says whether this trigger
 * wants that `triggerId`).
 */
function makeIngest<S>(
  accept: (params: TriggerParams, triggerId: number) => boolean,
  extended: boolean,
): Ingest<S> {
  return async ({ raw, params }) => {
    const method = String(raw.method).toUpperCase();

    if (method === "GET") {
      // Onfleet's URL validation: echo `check` back as plain text. It carries no secret, and the
      // reply is the random string itself — bounded to printable ASCII, 256 chars.
      const check = raw.query["check"];
      if (typeof check !== "string" || !CHECK_PATTERN.test(check)) {
        throw new Error("Onfleet validation refused: the check value is missing or malformed.");
      }
      return {
        events: [],
        response: { status: 200, headers: { "content-type": "text/plain" }, body: check },
      };
    }
    if (method !== "POST") throw new Error("Onfleet delivers webhooks with POST.");

    // Verify before parsing. `requireSecret` first: an unset secret must never compare equal to
    // an absent signature header.
    const secret = requireSecret(params.signingSecret);
    const body = requireRawBody(raw);
    const given = header(raw, "x-onfleet-signature");
    if (typeof given !== "string" || given === "") {
      throw new Error("Onfleet delivery refused: the signature header is missing.");
    }
    const expected = await hmacSha512Hex(secretBytes(secret), body);
    if (!timingSafeEqual(given.toLowerCase(), expected)) {
      throw new Error("Onfleet delivery refused: the signature does not match.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new Error("Onfleet delivery refused: the body is not JSON.");
    }
    const delivery = asObject(parsed);
    if (!delivery || typeof delivery.triggerId !== "number") {
      throw new Error("Not an Onfleet webhook delivery: expected a numeric triggerId.");
    }
    if (!accept(params, delivery.triggerId)) return [];
    return [normalize(delivery, extended)];
  };
}

async function register(
  client: OnfleetClient,
  callbackUrl: string,
  trigger: OnfleetTriggerId,
  name: string,
  threshold?: number,
): Promise<string> {
  const created = await client.request<{ id?: unknown }>("/webhooks", {
    method: "POST",
    body: {
      url: callbackUrl,
      name: `w6w ${name}`,
      trigger,
      ...(threshold === undefined ? {} : { threshold }),
    },
  });
  const webhookId = str(created?.id);
  if (!webhookId) throw new Error("Onfleet created the webhook but returned no id.");
  return webhookId;
}

const THRESHOLD_PARAMS: Record<"seconds" | "meters", Param> = {
  seconds: {
    key: "threshold",
    label: "Threshold (seconds)",
    type: "number",
    required: true,
    hint:
      "Fires once per task when the value reaches this many seconds. Onfleet allows 10 such webhooks.",
  },
  meters: {
    key: "threshold",
    label: "Threshold (meters)",
    type: "number",
    required: true,
    hint:
      "Fires once per task when the worker is this many meters away or closer. Onfleet allows 10 such webhooks.",
  },
};

/** Build one Onfleet webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, OnfleetEvent, TriggerState> {
  const handleIngest = makeIngest<TriggerState>(
    (_params, id) => id === spec.trigger,
    spec.extended === true,
  );

  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.threshold
      ? [SIGNING_SECRET_PARAM, THRESHOLD_PARAMS[spec.threshold]]
      : [SIGNING_SECRET_PARAM],
    output: spec.extended ? EXTENDED_OUTPUT : EVENT_OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      // Fail before any vendor call if the pasted secret could never verify a delivery.
      secretBytes(requireSecret(params.signingSecret));
      let threshold: number | undefined;
      if (spec.threshold) {
        threshold = Number(params.threshold);
        if (!Number.isFinite(threshold) || threshold <= 0) {
          throw new Error(
            `Onfleet ${spec.triggerName} needs a positive threshold (${spec.threshold}).`,
          );
        }
      }
      const client = new OnfleetClient(ctx);
      for (const id of await leftovers(client, callbackUrl)) await deleteWebhook(client, id);
      const webhookId = await register(
        client,
        callbackUrl,
        spec.trigger,
        spec.triggerName,
        threshold,
      );
      return { webhookId, trigger: spec.trigger };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      if (state?.webhookId) await deleteWebhook(new OnfleetClient(ctx), state.webhookId);
    },

    handleIngest,
  };
}

/**
 * Every webhook id that needs no threshold — what "any event" subscribes to by default
 * (docs.onfleet.com/reference/webhooks, 2026-11-10). 1, 2, 12, 30 and 31 are threshold triggers and
 * have their own triggers; 11 and 21 are undocumented.
 */
export const ANY_EVENT_NAMES: Array<[number, string]> = [
  [0, "taskStarted"],
  [3, "taskCompleted"],
  [4, "taskFailed"],
  [5, "workerDuty"],
  [6, "taskCreated"],
  [7, "taskUpdated"],
  [8, "taskDeleted"],
  [9, "taskAssigned"],
  [10, "taskUnassigned"],
  [13, "taskCloned"],
  [14, "smsRecipientResponseMissed"],
  [15, "workerCreated"],
  [16, "workerDeleted"],
  [17, "SMSRecipientOptOut"],
  [18, "autoDispatchJobCompleted"],
  [19, "taskBatchCreateJobCompleted"],
  [20, "routeOptimizationJobCompleted"],
  [22, "routePlanCreated"],
  [23, "routePlanStarted"],
  [24, "routePlanCompleted"],
  [25, "workerUpdated"],
  [26, "routePlanUpdated"],
  [27, "routePlanUnassigned"],
  [28, "routePlanAssigned"],
  [29, "routePlanDelayed"],
];

const THRESHOLD_EVENTS: Array<[number, string]> = [
  [1, "taskEta"],
  [2, "taskArrival"],
  [12, "taskDelayed"],
  [30, "predictedTaskDelay"],
  [31, "taskPredictedEta"],
];

/** `events` → trigger ids. Empty = every unthresholded event. Throws on a name it does not know. */
export function resolveEvents(events: unknown): number[] {
  const text = typeof events === "string" ? events : "";
  const tokens = text.split(",").map((t) => t.trim()).filter((t) => t !== "");
  if (tokens.length === 0) return ANY_EVENT_NAMES.map(([id]) => id);
  const ids = new Set<number>();
  for (const token of tokens) {
    const lower = token.toLowerCase();
    const hit = ANY_EVENT_NAMES.find(([id, name]) =>
      String(id) === token || name.toLowerCase() === lower
    );
    if (hit) {
      ids.add(hit[0]);
      continue;
    }
    if (
      THRESHOLD_EVENTS.some(([id, name]) => String(id) === token || name.toLowerCase() === lower)
    ) {
      throw new Error(
        `Onfleet event "${token.slice(0, 40)}" needs a threshold; use its own trigger instead.`,
      );
    }
    throw new Error(`Unknown Onfleet event "${token.slice(0, 40)}".`);
  }
  return [...ids].sort((a, b) => a - b);
}

export interface AnyEventState {
  webhooks: Array<{ webhookId: string; trigger: number }>;
}

/** The Any-event trigger: one Onfleet webhook per chosen event (Onfleet binds one trigger per webhook). */
export function anyEventTrigger(spec: {
  key: string;
  title: string;
  description: string;
  sample: OnfleetEvent;
}): TriggerDefinition<TriggerParams, OnfleetEvent, AnyEventState> {
  const handleIngest = makeIngest<AnyEventState>(
    (params, id) => resolveEvents(params.events).includes(id),
    true,
  );
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [SIGNING_SECRET_PARAM, {
      key: "events",
      label: "Events",
      type: "string",
      default: "",
      hint:
        "Comma-separated Onfleet trigger names (taskStarted, workerCreated, routePlanStarted, …) or ids. Empty = every event that needs no threshold.",
    }],
    output: EXTENDED_OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      secretBytes(requireSecret(params.signingSecret));
      const ids = resolveEvents(params.events);
      const client = new OnfleetClient(ctx);
      for (const id of await leftovers(client, callbackUrl)) await deleteWebhook(client, id);
      const webhooks: AnyEventState["webhooks"] = [];
      try {
        for (const trigger of ids) {
          const name = ANY_EVENT_NAMES.find(([id]) => id === trigger)![1];
          webhooks.push({ webhookId: await register(client, callbackUrl, trigger, name), trigger });
        }
      } catch (err) {
        // Never leave half a subscription behind.
        for (const w of webhooks) await deleteWebhook(client, w.webhookId).catch(() => {});
        throw err;
      }
      return { webhooks };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const client = new OnfleetClient(ctx);
      let failure: unknown;
      for (const w of state?.webhooks ?? []) {
        try {
          await deleteWebhook(client, w.webhookId);
        } catch (err) {
          failure ??= err;
        }
      }
      if (failure) throw failure;
    },

    handleIngest,
  };
}
