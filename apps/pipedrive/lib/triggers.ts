import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import { randomSecret, requireSecret, timingSafeEqual } from "../../_shared/webhook/mod.ts";
import { PipedriveClient } from "./client.ts";

interface TriggerState {
  webhookId: string;
}

interface PipedriveWebhook {
  id?: string | number;
  subscription_url?: string;
}

const OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Deal ID" },
  { key: "title", type: "string", label: "Title" },
  { key: "value", type: "number", label: "Value" },
  { key: "currency", type: "string", label: "Currency" },
];

function webhookId(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return undefined;
}

function isGone(error: unknown): boolean {
  return error instanceof Error && /Pipedrive (404|410)\b/.test(error.message);
}

async function deleteWebhook(client: PipedriveClient, id: string): Promise<void> {
  try {
    await client.request(`/webhooks/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    if (!isGone(error)) throw error;
  }
}

/** Pipedrive V1 has no delivery signature; the per-subscription callback URL is the secret. */
export const newDeal: TriggerDefinition<
  Record<string, never>,
  Record<string, unknown>,
  TriggerState
> = {
  key: "new-deal",
  title: "New Deal",
  description: "Fires when a deal is created. The run gets the new deal.",
  output: OUTPUT,
  sample: { id: "42", title: "Renewal", value: 1200, currency: "USD" },

  async onSubscribe({ callbackUrl }, ctx) {
    const client = new PipedriveClient(ctx);
    const existing = await client.request<PipedriveWebhook[]>("/webhooks");
    for (const hook of existing.data ?? []) {
      const id = webhookId(hook.id);
      if (id && hook.subscription_url === callbackUrl) await deleteWebhook(client, id);
    }
    const created = await client.request<PipedriveWebhook>("/webhooks", {
      method: "POST",
      body: {
        subscription_url: callbackUrl,
        event_action: "create",
        event_object: "deal",
        name: "w6w New Deal",
        version: "2.0",
      },
    });
    const id = webhookId(created.data?.id);
    if (!id) throw new Error("Pipedrive created the webhook but returned no id.");
    return { webhookId: id };
  },

  async onUnsubscribe({ state }, ctx) {
    const id = webhookId(state?.webhookId);
    if (id) await deleteWebhook(new PipedriveClient(ctx), id);
  },

  handleIngest({ raw }) {
    const call = raw as { method?: unknown; body?: unknown };
    if (String(call.method).toUpperCase() !== "POST") {
      throw new Error("Pipedrive delivers webhooks with POST.");
    }
    const body = call.body as Record<string, unknown> | undefined;
    // Webhooks v2.0 delivers {meta, data, previous}; we register v2.0 explicitly.
    return [(body?.data ?? body ?? {}) as Record<string, unknown>];
  },
};

// ---------------------------------------------------------------------------------------------
// Event triggers (verified 2026-11-10 against https://pipedrive.readme.io/docs/guide-for-webhooks-v2
// and https://developers.pipedrive.com/docs/api/v1/Webhooks)
//
// Pipedrive does not sign deliveries (no HMAC header exists in the v1 or v2 webhook docs). What it
// offers is HTTP Basic auth on the subscription URL (`http_auth_user` / `http_auth_password` on
// POST /webhooks, "will send these Basic Authentication credentials in the header of every HTTP request"). These triggers register a random
// password per subscription, keep it in the subscription state and refuse any delivery whose
// `Authorization` header does not carry it. `new-deal` above predates this and relies on the
// callback URL alone.
// ---------------------------------------------------------------------------------------------

/** A Pipedrive webhook event: `create | change | delete | *` on an object type (or `*`). */
export interface EventPair {
  action: string;
  object: string;
}

export interface EventsState {
  webhookId: string;
  webhookIds: string[];
  /** The random HTTP Basic password registered with every webhook of this subscription. */
  httpAuthPassword: string;
  events: EventPair[];
}

const BASIC_USER = "w6w";
const ACTIONS = new Set(["create", "change", "delete", "*"]);

/** `"create.deal, delete.person"` -> pairs. Empty means every event (`*.*`). */
export function parseEvents(input: unknown): EventPair[] {
  const names = typeof input === "string"
    ? input.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  if (names.length === 0) return [{ action: "*", object: "*" }];
  const out: EventPair[] = [];
  for (const name of names) {
    const m = /^([a-z*]+)\.([a-z_*]+)$/.exec(name);
    if (!m || !ACTIONS.has(m[1])) {
      throw new Error(
        `"${name}" is not a Pipedrive event (expected <create|change|delete|*>.<object>, e.g. "change.deal" or "*.*").`,
      );
    }
    if (!out.some((p) => p.action === m[1] && p.object === m[2])) {
      out.push({ action: m[1], object: m[2] });
    }
  }
  return out;
}

const refused = (why: string) => new Error(`Pipedrive delivery refused: ${why}`);

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

function headerValue(headers: Record<string, string>, name: string): string | undefined {
  for (const [k, v] of Object.entries(headers ?? {})) {
    if (k.toLowerCase() === name) return v;
  }
  return undefined;
}

/** `create` events: the object as it is now (matches `new-deal`). */
type RecordEvent = Record<string, unknown>;

/** `change` / `delete` / any-event: what happened, the object now and the fields that changed. */
export interface ChangeEvent {
  action: string | null;
  entity: string | null;
  entityId: string | null;
  timestamp: string | null;
  eventId: string | null;
  mergedFromId: string | null;
  mergedToId: string | null;
  current: Record<string, unknown> | null;
  previous: Record<string, unknown> | null;
}

export const CHANGE_OUTPUT: OutputField[] = [
  { key: "action", type: "string", label: "Action (create, change, delete)" },
  { key: "entity", type: "string", label: "Object type" },
  { key: "entityId", type: "string", label: "Object ID" },
  { key: "timestamp", type: "string", label: "Event time" },
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "mergedFromId", type: "string", label: "Merged from (change events of a merge)" },
  { key: "mergedToId", type: "string", label: "Merged into (delete events of a merge)" },
  { key: "current", type: "object", label: "Object now (empty on delete)" },
  { key: "previous", type: "object", label: "Previous values of the changed fields" },
];

function changeShape(body: Record<string, unknown>): ChangeEvent {
  const meta = asObject(body.meta) ?? {};
  return {
    action: str(meta.action),
    entity: str(meta.entity),
    entityId: str(meta.entity_id),
    timestamp: str(meta.timestamp),
    eventId: str(meta.id),
    mergedFromId: str(meta.merged_from_id),
    mergedToId: str(meta.merged_to_id),
    current: asObject(body.data),
    previous: asObject(body.previous),
  };
}

const matches = (events: EventPair[], action: string | null, entity: string | null) =>
  events.some((p) =>
    (p.action === "*" || p.action === action) && (p.object === "*" || p.object === entity)
  );

interface HookCore<P, E> {
  key: string;
  title: string;
  description: string;
  params: Param[];
  output: OutputField[];
  sample: E;
  eventsFor(params: P): EventPair[];
  shape(body: Record<string, unknown>): E;
}

function build<P, E>(c: HookCore<P, E>): TriggerDefinition<P, E, EventsState> {
  return {
    key: c.key,
    title: c.title,
    description: c.description,
    params: c.params,
    output: c.output,
    sample: c.sample,

    async onSubscribe({ params, callbackUrl }, ctx) {
      const events = c.eventsFor(params);
      const client = new PipedriveClient(ctx);
      const existing = await client.request<PipedriveWebhook[]>("/webhooks");
      for (const hook of existing.data ?? []) {
        const id = webhookId(hook.id);
        if (id && hook.subscription_url === callbackUrl) await deleteWebhook(client, id);
      }
      const httpAuthPassword = randomSecret();
      const ids: string[] = [];
      try {
        for (const e of events) {
          const created = await client.request<PipedriveWebhook>("/webhooks", {
            method: "POST",
            body: {
              subscription_url: callbackUrl,
              event_action: e.action,
              event_object: e.object,
              name: `w6w ${c.key} ${e.action}.${e.object}`,
              version: "2.0",
              http_auth_user: BASIC_USER,
              http_auth_password: httpAuthPassword,
            },
          });
          const id = webhookId(created.data?.id);
          if (!id) throw new Error("Pipedrive created the webhook but returned no id.");
          ids.push(id);
        }
      } catch (error) {
        for (const id of ids) await deleteWebhook(client, id).catch(() => undefined);
        throw error;
      }
      return { webhookId: ids[0], webhookIds: ids, httpAuthPassword, events };
    },

    async onUnsubscribe({ state }, ctx) {
      const ids = Array.isArray(state?.webhookIds)
        ? state.webhookIds.map(webhookId)
        : [webhookId(state?.webhookId)];
      const client = new PipedriveClient(ctx);
      for (const id of ids) if (id) await deleteWebhook(client, id);
    },

    handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error("Pipedrive delivers webhooks with POST.");
      }
      const password = requireSecret(state?.httpAuthPassword);
      const given = headerValue(raw.headers, "authorization");
      if (!given) throw refused("the Authorization header is missing");
      if (!timingSafeEqual(`Basic ${btoa(`${BASIC_USER}:${password}`)}`, given)) {
        throw refused("the credentials do not match");
      }
      const body = asObject(raw.body);
      if (!body) return [];
      const meta = asObject(body.meta);
      if (!meta || !matches(state.events, str(meta.action), str(meta.entity))) return [];
      return [c.shape(body)];
    },
  };
}

export interface CreatedSpec {
  key: string;
  title: string;
  description: string;
  object: string;
  output: OutputField[];
  sample: RecordEvent;
}

/** "New <object>": a `create.<object>` webhook; the run gets the object as it is. */
export function createdTrigger(
  spec: CreatedSpec,
): TriggerDefinition<Record<string, never>, RecordEvent, EventsState> {
  return build<Record<string, never>, RecordEvent>({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [],
    output: spec.output,
    sample: spec.sample,
    eventsFor: () => [{ action: "create", object: spec.object }],
    // v2 delivers {meta, data, previous}; for a create `data` is the new object.
    shape: (body) => asObject(body.data) ?? {},
  });
}

export interface ChangedSpec {
  key: string;
  title: string;
  description: string;
  action: "change" | "delete";
  object: string;
  sample: ChangeEvent;
}

/** "<Object> updated / deleted": a `change.<object>` or `delete.<object>` webhook. */
export function changedTrigger(
  spec: ChangedSpec,
): TriggerDefinition<Record<string, never>, ChangeEvent, EventsState> {
  return build<Record<string, never>, ChangeEvent>({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [],
    output: CHANGE_OUTPUT,
    sample: spec.sample,
    eventsFor: () => [{ action: spec.action, object: spec.object }],
    shape: changeShape,
  });
}

/** The Any event trigger: registers one webhook per listed `<action>.<object>` (empty = `*.*`). */
export function anyEventTrigger(
  spec: { sample: ChangeEvent },
): TriggerDefinition<{ events?: string }, ChangeEvent, EventsState> {
  return build<{ events?: string }, ChangeEvent>({
    key: "any-event",
    title: "Any Event",
    description:
      "Fires on the Pipedrive events you list (or every event when empty). The run gets what happened, the object now and the fields that changed.",
    params: [{
      key: "events",
      label: "Events",
      type: "string",
      placeholder: "change.deal, delete.person",
      hint:
        "Comma-separated <create|change|delete|*>.<object> pairs (objects: activity, deal, lead, note, organization, person, product, stage, pipeline, user, project, task …). Empty subscribes to every event (*.*).",
    }],
    output: CHANGE_OUTPUT,
    sample: spec.sample,
    eventsFor: (p) => parseEvents(p?.events),
    shape: changeShape,
  });
}
