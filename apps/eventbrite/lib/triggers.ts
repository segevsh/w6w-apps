import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { API_URL, EventbriteClient, EventbriteError } from "./client.ts";

/**
 * Eventbrite webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` creates an organization webhook pointed at the host's `callbackUrl`, after
 *     deleting any webhook already pointed there: the URL is unique to the subscription, so a
 *     webhook carrying it is a leftover of an earlier attempt that never recorded its id.
 *   - `onUnsubscribe` deletes that webhook; one Eventbrite no longer has counts as deleted.
 *   - `handleIngest` turns a delivery into one event, or none for the dashboard's test ping or an
 *     action the subscription did not ask for. Eventbrite does not sign deliveries: the callback
 *     URL is the shared secret, and a delivery naming another webhook is refused.
 *   - `parseOutput` fetches the record the delivery points at (`api_url`) at dispatch time, so a
 *     slow Eventbrite never delays the listener's acknowledgement and a failed fetch is retried
 *     by the dispatcher rather than lost.
 *
 * Eventbrite's delivery body is a notification, not the record:
 * `{ "config": { "action", "webhook_id", "user_id", "endpoint_url" }, "api_url": "…" }`.
 */

/** Every action an organization webhook can subscribe to (blueprint, "Create Webhook"). */
export const WEBHOOK_ACTIONS = [
  "attendee.checked_in",
  "attendee.checked_out",
  "attendee.updated",
  "event.created",
  "event.published",
  "event.updated",
  "event.unpublished",
  "order.placed",
  "order.refunded",
  "order.updated",
  "organizer.updated",
  "ticket_class.created",
  "ticket_class.deleted",
  "ticket_class.updated",
  "venue.updated",
] as const;
export type WebhookAction = typeof WEBHOOK_ACTIONS[number];

/** The record an action's `api_url` points at — the part of the action before the dot. */
export type ResourceType = "attendee" | "event" | "order" | "organizer" | "ticket_class" | "venue";

/** Actions whose record no longer exists by the time the delivery arrives. */
const GONE_ACTIONS: ReadonlySet<string> = new Set(["ticket_class.deleted"]);

/** Most pages of an organization's webhooks `onSubscribe` will read looking for a leftover. */
const MAX_WEBHOOK_PAGES = 20;

export interface TriggerParams {
  organizationId?: string;
  eventId?: string;
  actions?: string[];
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  organizationId: string;
  actions: string[];
  eventId: string | null;
}

/** The stored event: one delivery, before its record is fetched. */
export interface NormalizedEvent {
  action: string;
  resourceType: string;
  resourceId: string | null;
  apiUrl: string;
  webhookId: string | null;
  userId: string | null;
}

/** The run's `trigger.event`: the delivery plus the record it points at. */
export interface TriggerEvent extends NormalizedEvent {
  /** The fetched record; `null` when it no longer exists (a deleted ticket class, say). */
  resource: Record<string, unknown> | null;
}

const ORGANIZATION_PARAM: Param = {
  key: "organizationId",
  label: "Organization ID",
  type: "string",
  hint:
    "The organization to watch. Leave blank when the account belongs to exactly one organization.",
};

const EVENT_PARAM: Param = {
  key: "eventId",
  label: "Event ID",
  type: "string",
  hint: "Only fire for this event. Leave blank for every event in the organization.",
};

const ACTIONS_PARAM: Param = {
  key: "actions",
  label: "Actions",
  type: "multiselect",
  required: true,
  options: WEBHOOK_ACTIONS.map((a) => ({ value: a, label: a })),
  hint: "The Eventbrite actions that start the workflow.",
};

const DELIVERY_OUTPUT: OutputField[] = [
  { key: "action", type: "string", label: "Action" },
  { key: "resourceType", type: "string", label: "Resource Type" },
  { key: "resourceId", type: "string", label: "Resource ID" },
  { key: "apiUrl", type: "string", label: "API URL" },
  { key: "webhookId", type: "string", label: "Webhook ID" },
  { key: "userId", type: "string", label: "User ID" },
];

/** Downstream autocomplete for each record type, under `resource.`. */
const RESOURCE_OUTPUT: Record<ResourceType, OutputField[]> = {
  order: [
    { key: "resource.id", type: "string", label: "Order ID" },
    { key: "resource.event_id", type: "string", label: "Event ID" },
    { key: "resource.name", type: "string", label: "Buyer Name" },
    { key: "resource.first_name", type: "string", label: "Buyer First Name" },
    { key: "resource.last_name", type: "string", label: "Buyer Last Name" },
    { key: "resource.email", type: "string", label: "Buyer Email" },
    { key: "resource.status", type: "string", label: "Status" },
    { key: "resource.created", type: "string", label: "Created" },
    { key: "resource.costs.gross.display", type: "string", label: "Gross Total" },
  ],
  attendee: [
    { key: "resource.id", type: "string", label: "Attendee ID" },
    { key: "resource.event_id", type: "string", label: "Event ID" },
    { key: "resource.order_id", type: "string", label: "Order ID" },
    { key: "resource.profile.name", type: "string", label: "Name" },
    { key: "resource.profile.email", type: "string", label: "Email" },
    { key: "resource.ticket_class_name", type: "string", label: "Ticket Class" },
    { key: "resource.checked_in", type: "boolean", label: "Checked In" },
    { key: "resource.status", type: "string", label: "Status" },
  ],
  event: [
    { key: "resource.id", type: "string", label: "Event ID" },
    { key: "resource.name.text", type: "string", label: "Name" },
    { key: "resource.url", type: "string", label: "URL" },
    { key: "resource.start.utc", type: "string", label: "Starts (UTC)" },
    { key: "resource.end.utc", type: "string", label: "Ends (UTC)" },
    { key: "resource.status", type: "string", label: "Status" },
  ],
  ticket_class: [
    { key: "resource.id", type: "string", label: "Ticket Class ID" },
    { key: "resource.event_id", type: "string", label: "Event ID" },
    { key: "resource.name", type: "string", label: "Name" },
    { key: "resource.cost.display", type: "string", label: "Cost" },
    { key: "resource.quantity_total", type: "number", label: "Quantity" },
  ],
  organizer: [
    { key: "resource.id", type: "string", label: "Organizer ID" },
    { key: "resource.name", type: "string", label: "Name" },
    { key: "resource.url", type: "string", label: "URL" },
  ],
  venue: [
    { key: "resource.id", type: "string", label: "Venue ID" },
    { key: "resource.name", type: "string", label: "Name" },
    { key: "resource.address.localized_address_display", type: "string", label: "Address" },
  ],
};

/** One plausible record per type, for the editor's preview before a live delivery arrives. */
const SAMPLE_RESOURCE: Record<ResourceType, { path: string; record: Record<string, unknown> }> = {
  order: {
    path: "orders/1234567890",
    record: {
      id: "1234567890",
      event_id: "62541733007",
      name: "Alex Doe",
      first_name: "Alex",
      last_name: "Doe",
      email: "alex@example.com",
      status: "placed",
      created: "2026-10-08T09:00:00Z",
      costs: { gross: { display: "$25.00" } },
    },
  },
  attendee: {
    path: "events/62541733007/attendees/2345678901",
    record: {
      id: "2345678901",
      event_id: "62541733007",
      order_id: "1234567890",
      profile: { name: "Alex Doe", email: "alex@example.com" },
      ticket_class_name: "General Admission",
      checked_in: true,
      status: "Checked In",
    },
  },
  event: {
    path: "events/62541733007",
    record: {
      id: "62541733007",
      name: { text: "Launch Night" },
      url: "https://www.eventbrite.com/e/launch-night-tickets-62541733007",
      start: { utc: "2026-11-01T18:00:00Z" },
      end: { utc: "2026-11-01T21:00:00Z" },
      status: "live",
    },
  },
  ticket_class: {
    path: "events/62541733007/ticket_classes/345678901",
    record: {
      id: "345678901",
      event_id: "62541733007",
      name: "General Admission",
      cost: { display: "$25.00" },
      quantity_total: 200,
    },
  },
  organizer: {
    path: "organizers/456789012",
    record: {
      id: "456789012",
      name: "Example Events",
      url: "https://www.eventbrite.com/o/456789012",
    },
  },
  venue: {
    path: "venues/567890123",
    record: {
      id: "567890123",
      name: "Main Hall",
      address: { localized_address_display: "1 Main St, Springfield" },
    },
  },
};

/** The sample `trigger.event` for one action. */
function sampleFor(action: WebhookAction): TriggerEvent {
  const resourceType = action.split(".")[0] as ResourceType;
  const { path, record } = SAMPLE_RESOURCE[resourceType];
  const apiUrl = `${API_URL}/${path}/`;
  return {
    action,
    resourceType,
    resourceId: resourceIdOf(apiUrl),
    apiUrl,
    webhookId: "2006536",
    userId: "308733706151",
    resource: GONE_ACTIONS.has(action) ? null : record,
  };
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

/** The delivery body, whether the listener parsed it as JSON or kept it as text. */
function deliveryBody(body: unknown): Record<string, unknown> | null {
  if (typeof body === "string") {
    try {
      return asObject(JSON.parse(body));
    } catch {
      return null;
    }
  }
  return asObject(body);
}

/** The dashboard's "Test" button sends a placeholder `api_url` and the action `test`. */
function isTestPing(action: string | null, apiUrl: string | null): boolean {
  return action === "test" || (apiUrl !== null && apiUrl.includes("api-endpoint-to-fetch"));
}

/**
 * The record URL, checked before anything fetches it with the connection's credential: it must
 * be Eventbrite's own API, never a host a forged delivery chose.
 */
function checkedApiUrl(apiUrl: string): string {
  let url: URL;
  try {
    url = new URL(apiUrl);
  } catch {
    throw new Error(`Eventbrite delivery has an unreadable api_url: ${apiUrl}`);
  }
  const base = new URL(API_URL);
  if (url.protocol !== "https:" || url.host !== base.host || !url.pathname.startsWith("/v3/")) {
    throw new Error(`Eventbrite delivery api_url is not on ${base.host}/v3: ${apiUrl}`);
  }
  return url.toString();
}

/** The record's id: the last numeric path segment (`/v3/events/1/attendees/2/` → `2`). */
function resourceIdOf(apiUrl: string): string | null {
  const segments = new URL(apiUrl).pathname.split("/").filter((s) => s !== "");
  for (let i = segments.length - 1; i >= 0; i--) {
    if (/^\d+$/.test(segments[i])) return segments[i];
  }
  return null;
}

/**
 * One delivery body → its normalized event, or `null` for a test ping. Throws on a body that is
 * not an Eventbrite delivery.
 */
export function normalizeDelivery(body: unknown): NormalizedEvent | null {
  const delivery = deliveryBody(body);
  const config = asObject(delivery?.config);
  const action = str(config?.action);
  const rawUrl = str(delivery?.api_url);
  if (!delivery || !config || !action) {
    throw new Error("Not an Eventbrite webhook delivery: expected `config.action` and `api_url`.");
  }
  if (isTestPing(action, rawUrl)) return null;
  if (!rawUrl) throw new Error(`Eventbrite delivery for "${action}" has no api_url.`);
  const apiUrl = checkedApiUrl(rawUrl);
  return {
    action,
    resourceType: action.split(".")[0],
    resourceId: resourceIdOf(apiUrl),
    apiUrl,
    webhookId: str(config.webhook_id),
    userId: str(config.user_id),
  };
}

/** The organization to register on: the param, else the account's only organization. */
async function resolveOrganization(client: EventbriteClient, params: TriggerParams) {
  const given = params.organizationId?.trim();
  if (given) return given;
  const { organizations } = await client.request<{ organizations?: Array<{ id?: unknown }> }>(
    "/users/me/organizations/",
  );
  const ids = (organizations ?? []).map((o) => str(o.id)).filter((id): id is string => !!id);
  if (ids.length !== 1) {
    throw new Error(
      ids.length === 0
        ? "This Eventbrite account belongs to no organization, so there is nowhere to register a webhook."
        : `This Eventbrite account belongs to ${ids.length} organizations (${
          ids.join(", ")
        }): set Organization ID to the one to watch.`,
    );
  }
  return ids[0];
}

/** Ids of the organization's webhooks that already deliver to `endpointUrl`. */
async function webhooksPointingAt(
  client: EventbriteClient,
  organizationId: string,
  endpointUrl: string,
): Promise<string[]> {
  const found: string[] = [];
  let continuation: string | undefined;
  let page = 1;
  for (let i = 0; i < MAX_WEBHOOK_PAGES; i++) {
    const res = await client.request<{
      webhooks?: Array<{ id?: unknown; endpoint_url?: unknown }>;
      pagination?: { has_more_items?: boolean; continuation?: string };
    }>(`/organizations/${encodeURIComponent(organizationId)}/webhooks/`, {
      query: continuation ? { continuation } : { page },
    });
    for (const w of res.webhooks ?? []) {
      const id = str(w.id);
      if (id && w.endpoint_url === endpointUrl) found.push(id);
    }
    if (!res.pagination?.has_more_items) break;
    continuation = res.pagination.continuation;
    page++;
  }
  return found;
}

/** Delete one webhook. One Eventbrite no longer has is already what we wanted. */
async function deleteWebhook(client: EventbriteClient, webhookId: string): Promise<void> {
  try {
    await client.request(`/webhooks/${encodeURIComponent(webhookId)}/`, { method: "DELETE" });
  } catch (err) {
    if (err instanceof EventbriteError && (err.status === 404 || err.status === 410)) return;
    throw err;
  }
}

/** The record a delivery points at, or `null` when it no longer exists. */
async function fetchResource(
  ctx: HookContext,
  event: NormalizedEvent,
): Promise<Record<string, unknown> | null> {
  if (GONE_ACTIONS.has(event.action)) return null;
  try {
    return asObject(await new EventbriteClient(ctx).request(checkedApiUrl(event.apiUrl)));
  } catch (err) {
    if (err instanceof EventbriteError && (err.status === 404 || err.status === 410)) return null;
    throw err;
  }
}

function isNormalized(v: unknown): v is NormalizedEvent {
  const o = asObject(v);
  return !!o && typeof o.action === "string" && typeof o.apiUrl === "string";
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The one action this trigger fires on; omitted for the trigger whose actions are a param. */
  action?: WebhookAction;
}

/** Build one Eventbrite webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, NormalizedEvent, TriggerState> {
  const fixed = spec.action;
  const resource = fixed ? fixed.split(".")[0] as ResourceType : undefined;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: fixed
      ? [ORGANIZATION_PARAM, EVENT_PARAM]
      : [ORGANIZATION_PARAM, ACTIONS_PARAM, EVENT_PARAM],
    output: [
      ...DELIVERY_OUTPUT,
      ...(resource
        ? RESOURCE_OUTPUT[resource]
        : [{ key: "resource", type: "object", label: "Record" } as OutputField]),
    ],
    sample: sampleFor(fixed ?? "order.placed"),

    async onSubscribe({ params, callbackUrl }, ctx) {
      const actions = fixed ? [fixed] : [...new Set(params.actions ?? [])];
      if (actions.length === 0) throw new Error("Choose at least one Eventbrite action.");
      const unknown = actions.filter((a) => !(WEBHOOK_ACTIONS as readonly string[]).includes(a));
      if (unknown.length > 0) throw new Error(`Unknown Eventbrite action: ${unknown.join(", ")}`);

      const client = new EventbriteClient(ctx);
      const organizationId = await resolveOrganization(client, params);
      for (const id of await webhooksPointingAt(client, organizationId, callbackUrl)) {
        await deleteWebhook(client, id);
      }
      const eventId = params.eventId?.trim() || null;
      const body: Record<string, unknown> = {
        endpoint_url: callbackUrl,
        actions: actions.join(","),
      };
      if (eventId) body.event_id = eventId;
      const created = await client.request<{ id?: unknown }>(
        `/organizations/${encodeURIComponent(organizationId)}/webhooks/`,
        { method: "POST", body },
      );
      const webhookId = str(created?.id);
      if (!webhookId) throw new Error("Eventbrite created the webhook but returned no id.");
      return { webhookId, organizationId, actions, eventId };
    },

    async onUnsubscribe({ state }, ctx) {
      const webhookId = str((state as Partial<TriggerState> | undefined)?.webhookId);
      if (webhookId) await deleteWebhook(new EventbriteClient(ctx), webhookId);
    },

    handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Eventbrite delivers webhooks with POST, not ${raw.method}.`);
      }
      const event = normalizeDelivery(raw.body);
      if (!event) return [];
      const expected = str(state?.webhookId);
      if (expected && event.webhookId && event.webhookId !== expected) {
        throw new Error(
          `Delivery is for Eventbrite webhook ${event.webhookId}, not this subscription's ${expected}.`,
        );
      }
      const wanted = fixed ? [fixed] : state?.actions ?? [];
      if (wanted.length > 0 && !wanted.includes(event.action)) return [];
      return [event];
    },

    async parseOutput({ normalized, call }, ctx): Promise<TriggerEvent> {
      // A row the ingest parser never saw (it was not run) holds the raw body instead.
      const event = isNormalized(normalized)
        ? normalized
        : normalizeDelivery(asObject(call)?.body ?? normalized);
      if (!event) throw new Error("An Eventbrite test ping has no record to fetch.");
      return { ...event, resource: await fetchResource(ctx, event) };
    },
  };
}
