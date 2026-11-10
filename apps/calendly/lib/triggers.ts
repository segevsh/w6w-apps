import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";
import { CalendlyClient, uuidOf } from "./client.ts";

/**
 * Calendly webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` looks up the caller (`GET /users/me`) and creates a webhook subscription
 *     (`POST /webhook_subscriptions`) for one event, with a random per-subscription
 *     `signing_key` (D5 (1)) kept in subscription state.
 *   - `onUnsubscribe` deletes it; one Calendly no longer has counts as deleted.
 *   - `handleIngest` verifies `Calendly-Webhook-Signature: t=<unix>,v1=<hex>` (HMAC-SHA256 of
 *     `t + "." + exact request body` under the signing key) and rejects a timestamp older than
 *     Calendly's 3 minute tolerance, BEFORE it parses anything.
 *
 * OAuth connections: Calendly signs an OAuth app's webhooks with the app's own key, so the
 * optional `signingKey` param carries it (D5 (2)); it overrides the generated one.
 *
 * Docs (verified 2026-11-10):
 *   https://developer.calendly.com/api-docs/overview/webhooks/webhook-signatures
 *   https://developer.calendly.com/api-docs/calendly-api/webhooks/create-webhook-subscription
 *   https://developer.calendly.com/api-docs/calendly-api/webhooks/get-sample-webhook-data
 */

/** Calendly's documented replay tolerance, in seconds. */
export const TOLERANCE_SEC = 180;

export type CalendlyEvent =
  | "invitee.created"
  | "invitee.canceled"
  | "invitee_no_show.created"
  | "invitee_no_show.deleted";

export interface TriggerParams {
  scope?: "organization" | "user";
  signingKey?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookUuid: string;
  event: CalendlyEvent;
  scope: "organization" | "user";
  secret: string | null;
}

/** The run's `trigger.event`: one invitee event. */
export interface InviteeEvent {
  event: string;
  createdAt: string | null;
  inviteeUri: string | null;
  name: string | null;
  email: string | null;
  status: string | null;
  scheduledEventUri: string | null;
  eventName: string | null;
  startTime: string | null;
  endTime: string | null;
  location: unknown;
  questionsAndAnswers: unknown[];
  cancellation: Record<string, unknown> | null;
  rescheduled: boolean;
  cancelUrl: string | null;
  rescheduleUrl: string | null;
  payload: Record<string, unknown>;
}

const SCOPE_PARAM: Param = {
  key: "scope",
  label: "Scope",
  type: "select",
  options: [
    { value: "organization", label: "Whole organization" },
    { value: "user", label: "Only my events" },
  ],
  hint: "Whose bookings start the workflow. Default: the whole organization.",
};

const SIGNING_KEY_PARAM: Param = {
  key: "signingKey",
  label: "Signing key (OAuth connections only)",
  type: "secret",
  hint:
    "Leave blank for a personal access token. With OAuth, Calendly signs with your OAuth app's webhook signing key: paste it here.",
};

const OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event" },
  { key: "createdAt", type: "string", label: "Created At" },
  { key: "inviteeUri", type: "string", label: "Invitee URI" },
  { key: "name", type: "string", label: "Invitee Name" },
  { key: "email", type: "string", label: "Invitee Email" },
  { key: "status", type: "string", label: "Status" },
  { key: "scheduledEventUri", type: "string", label: "Scheduled Event URI" },
  { key: "eventName", type: "string", label: "Event Name" },
  { key: "startTime", type: "string", label: "Start Time" },
  { key: "endTime", type: "string", label: "End Time" },
  { key: "location", type: "object", label: "Location" },
  { key: "questionsAndAnswers", type: "array", label: "Questions and Answers" },
  { key: "cancellation", type: "object", label: "Cancellation" },
  { key: "rescheduled", type: "boolean", label: "Rescheduled" },
  { key: "cancelUrl", type: "string", label: "Cancel URL" },
  { key: "rescheduleUrl", type: "string", label: "Reschedule URL" },
  { key: "payload", type: "object", label: "Full Payload" },
];

function sampleFor(event: CalendlyEvent): InviteeEvent {
  const canceled = event === "invitee.canceled";
  return {
    event,
    createdAt: "2026-11-09T10:00:00.000000Z",
    inviteeUri:
      "https://api.calendly.com/scheduled_events/GBGBDCAADAEDCRZ2/invitees/AAAAAAAAAAAAAAAA",
    name: "Ada Lovelace",
    email: "ada@example.com",
    status: canceled ? "canceled" : "active",
    scheduledEventUri: "https://api.calendly.com/scheduled_events/GBGBDCAADAEDCRZ2",
    eventName: "30 Minute Meeting",
    startTime: "2026-11-12T15:00:00.000000Z",
    endTime: "2026-11-12T15:30:00.000000Z",
    location: { type: "zoom", join_url: "(video call link)" },
    questionsAndAnswers: [{ question: "Topic?", answer: "Roadmap" }],
    cancellation: canceled ? { canceled_by: "Ada Lovelace", reason: "Conflict" } : null,
    rescheduled: false,
    cancelUrl: "calendly.com/cancellations/AAAAAAAAAAAAAAAA",
    rescheduleUrl: "calendly.com/reschedulings/AAAAAAAAAAAAAAAA",
    payload: {},
  };
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

/** The delivery body → its event. Throws on a body that is not a Calendly invitee delivery. */
export function normalizeDelivery(body: unknown): InviteeEvent {
  const delivery = asObject(body);
  const payload = asObject(delivery?.payload);
  const event = str(delivery?.event);
  if (!delivery || !payload || !event) {
    throw new Error("Not a Calendly webhook delivery: expected `event` and `payload`.");
  }
  const scheduled = asObject(payload.scheduled_event);
  return {
    event,
    createdAt: str(delivery.created_at),
    inviteeUri: str(payload.uri),
    name: str(payload.name),
    email: str(payload.email),
    status: str(payload.status),
    scheduledEventUri: str(scheduled?.uri) ?? str(payload.event),
    eventName: str(scheduled?.name),
    startTime: str(scheduled?.start_time),
    endTime: str(scheduled?.end_time),
    location: scheduled?.location ?? null,
    questionsAndAnswers: Array.isArray(payload.questions_and_answers)
      ? payload.questions_and_answers
      : [],
    cancellation: asObject(payload.cancellation),
    rescheduled: payload.rescheduled === true,
    cancelUrl: str(payload.cancel_url),
    rescheduleUrl: str(payload.reschedule_url),
    payload,
  };
}

/** `t=<unix>,v1=<hex>` → its parts, or null when either is missing or malformed. */
function parseSignatureHeader(value: string): { t: number; v1: string } | null {
  let t: string | undefined;
  let v1: string | undefined;
  for (const part of value.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k === "t") t = v;
    else if (k === "v1") v1 = v;
  }
  if (t === undefined || v1 === undefined || !/^\d{1,15}$/.test(t) || v1 === "") return null;
  return { t: Number(t), v1 };
}

/**
 * Verify `Calendly-Webhook-Signature` over the exact bytes received and return them. Throws
 * (never echoing the key, the signature or the header) on any failure; an unset key is refused
 * before any compare.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
  nowMs: number = Date.now(),
): Promise<string> {
  const body = requireRawBody(raw);
  const key = requireSecret(secret);
  const given = header(raw, "calendly-webhook-signature");
  if (given === undefined || given === "") {
    throw new Error("Calendly delivery refused: the Calendly-Webhook-Signature header is missing.");
  }
  const parsed = parseSignatureHeader(given);
  if (!parsed) {
    throw new Error("Calendly delivery refused: the signature header is malformed.");
  }
  const expected = await hmac("SHA-256", key, `${parsed.t}.${body}`, "hex");
  if (!timingSafeEqual(expected, parsed.v1)) {
    throw new Error("Calendly delivery refused: the signature does not match.");
  }
  if (!withinTolerance(parsed.t, nowMs, TOLERANCE_SEC)) {
    throw new Error("Calendly delivery refused: the signature timestamp is outside the tolerance.");
  }
  return body;
}

/** True for the "no such subscription" answers `CalendlyClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^Calendly (404|410)\b/.test(err.message);
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  event: CalendlyEvent;
}

/** Build one Calendly webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
  now: () => number = Date.now,
): TriggerDefinition<TriggerParams, InviteeEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [SCOPE_PARAM, SIGNING_KEY_PARAM],
    output: OUTPUT,
    sample: sampleFor(spec.event),

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const scope = params.scope === "user" ? "user" : "organization";
      const client = new CalendlyClient(ctx);
      const me = await client.request<{
        resource?: { uri?: unknown; current_organization?: unknown };
      }>("/users/me");
      const organization = str(me?.resource?.current_organization);
      const user = str(me?.resource?.uri);
      if (!organization || !user) {
        throw new Error("Calendly returned no organization for this user.");
      }
      const own = params.signingKey ? null : randomSecret();
      const body: Record<string, unknown> = {
        url: callbackUrl,
        events: [spec.event],
        organization,
        scope,
      };
      if (scope === "user") body.user = user;
      if (own) body.signing_key = own;
      const created = await client.request<{ resource?: { uri?: unknown } }>(
        "/webhook_subscriptions",
        { method: "POST", body },
      );
      const uri = str(created?.resource?.uri);
      if (!uri) throw new Error("Calendly created the webhook but returned no uri.");
      return { webhookUuid: uuidOf(uri), event: spec.event, scope, secret: own };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const uuid = str((state as Partial<TriggerState> | undefined)?.webhookUuid);
      if (!uuid) return;
      try {
        await new CalendlyClient(ctx).request(
          `/webhook_subscriptions/${encodeURIComponent(uuid)}`,
          { method: "DELETE" },
        );
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, params, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Calendly delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, params?.signingKey || state?.secret, now());
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Calendly delivery refused: the body is not JSON.");
      }
      const event = normalizeDelivery(parsed);
      if (event.event !== spec.event) return [];
      return [event];
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Round 3: the rest of Calendly's event catalog (event types, routing forms, the Any-event
// trigger). The invitee / no-show events above share `webhookTrigger`; everything below carries
// a generic delivery envelope `{ event, created_at, created_by, payload }`.
// ---------------------------------------------------------------------------------------------

/** Every event `POST /webhook_subscriptions` accepts (create-webhook-subscription, 2026-11-10). */
export const KNOWN_EVENTS = [
  "invitee.created",
  "invitee.canceled",
  "invitee_no_show.created",
  "invitee_no_show.deleted",
  "event_type.created",
  "event_type.deleted",
  "event_type.updated",
  "meeting_recap.created",
  "meeting_recap.updated",
  "meeting_recap.deleted",
  "routing_form_submission.created",
  "contact.created",
  "contact.updated",
  "contact.deleted",
] as const;

/**
 * What an empty "Events" param subscribes to: the events every Calendly plan, scope and auth
 * scope allows. Calendly has no "all events" value, and the rest need a paid plan or a single
 * scope (routing forms: organization only; meeting recaps: user only), so they are opt-in.
 */
export const DEFAULT_ANY_EVENTS: string[] = [
  "invitee.created",
  "invitee.canceled",
  "invitee_no_show.created",
  "invitee_no_show.deleted",
  "event_type.created",
  "event_type.updated",
  "event_type.deleted",
];

/** `invitee.created, event_type.updated` → the validated list; empty → the default list. */
export function parseEvents(input: unknown): string[] {
  if (input === undefined || input === null || input === "") return [...DEFAULT_ANY_EVENTS];
  if (typeof input !== "string") {
    throw new Error("Calendly events must be a comma-separated list of event names.");
  }
  const names = [...new Set(input.split(/[\s,]+/).filter((n) => n !== ""))];
  if (names.length === 0) return [...DEFAULT_ANY_EVENTS];
  const known: readonly string[] = KNOWN_EVENTS;
  const unknown = names.filter((n) => !known.includes(n));
  if (unknown.length > 0) {
    throw new Error(
      `Calendly has no event named ${unknown.join(", ")}. Known events: ${
        KNOWN_EVENTS.join(", ")
      }.`,
    );
  }
  return names;
}

/** Calendly allows routing-form events on the organization scope and recaps on the user scope. */
export function checkScope(events: string[], scope: "organization" | "user"): void {
  const routing = events.some((e) => e.startsWith("routing_form_submission."));
  const recap = events.some((e) => e.startsWith("meeting_recap."));
  if (routing && scope !== "organization") {
    throw new Error(
      "Calendly allows routing_form_submission.created only on the organization scope; choose 'Whole organization'.",
    );
  }
  if (recap && scope !== "user") {
    throw new Error(
      "Calendly allows meeting_recap events only on the user scope; choose 'Only my events'.",
    );
  }
  if (routing && recap) {
    throw new Error(
      "Calendly needs separate subscriptions for routing_form_submission and meeting_recap events (different scopes).",
    );
  }
}

/** The run's `trigger.event` for every non-invitee event. */
export interface ResourceEvent {
  event: string;
  createdAt: string | null;
  createdBy: string | null;
  uri: string | null;
  name: string | null;
  email: string | null;
  [extra: string]: unknown;
  payload: Record<string, unknown>;
}

/** The state of a resource / Any-event subscription. */
export interface ResourceState {
  webhookUuid: string;
  events: string[];
  scope: "organization" | "user";
  secret: string | null;
}

export interface ResourceParams extends TriggerParams {
  events?: string;
}

/** The delivery envelope → one event (throws on a body that is not a Calendly delivery). */
export function normalizeResource(
  body: unknown,
  extract?: (payload: Record<string, unknown>) => Record<string, unknown>,
): ResourceEvent {
  const delivery = asObject(body);
  const payload = asObject(delivery?.payload);
  const event = str(delivery?.event);
  if (!delivery || !payload || !event) {
    throw new Error("Not a Calendly webhook delivery: expected `event` and `payload`.");
  }
  return {
    event,
    createdAt: str(delivery.created_at),
    createdBy: str(delivery.created_by),
    uri: str(payload.uri),
    name: str(payload.name),
    email: str(payload.email),
    ...(extract ? extract(payload) : {}),
    payload,
  };
}

const BASE_OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event" },
  { key: "createdAt", type: "string", label: "Created At" },
  { key: "createdBy", type: "string", label: "Created By (User URI)" },
  { key: "uri", type: "string", label: "Resource URI" },
  { key: "name", type: "string", label: "Name" },
  { key: "email", type: "string", label: "Email" },
];
const PAYLOAD_OUTPUT: OutputField = { key: "payload", type: "object", label: "Full Payload" };

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  hint:
    "Comma-separated Calendly events, e.g. invitee.created, event_type.updated. Empty = invitee.created, invitee.canceled, invitee_no_show.created/deleted and event_type.created/updated/deleted. Also available: routing_form_submission.created (organization scope), meeting_recap.created/updated/deleted (user scope), contact.created/updated/deleted (paid plans).",
};

/** Create the subscription for `events` and return the state the host persists. */
async function register(
  events: string[],
  params: TriggerParams,
  callbackUrl: string,
  ctx: HookContext,
): Promise<ResourceState> {
  const scope = params.scope === "user" ? "user" : "organization";
  checkScope(events, scope);
  const client = new CalendlyClient(ctx);
  const me = await client.request<{
    resource?: { uri?: unknown; current_organization?: unknown };
  }>("/users/me");
  const organization = str(me?.resource?.current_organization);
  const user = str(me?.resource?.uri);
  if (!organization || !user) {
    throw new Error("Calendly returned no organization for this user.");
  }
  const own = params.signingKey ? null : randomSecret();
  const body: Record<string, unknown> = { url: callbackUrl, events, organization, scope };
  if (scope === "user") body.user = user;
  if (own) body.signing_key = own;
  const created = await client.request<{ resource?: { uri?: unknown } }>(
    "/webhook_subscriptions",
    { method: "POST", body },
  );
  const uri = str(created?.resource?.uri);
  if (!uri) throw new Error("Calendly created the webhook but returned no uri.");
  return { webhookUuid: uuidOf(uri), events, scope, secret: own };
}

async function unregister(state: unknown, ctx: HookContext): Promise<void> {
  const uuid = str((state as Partial<ResourceState> | undefined)?.webhookUuid);
  if (!uuid) return;
  try {
    await new CalendlyClient(ctx).request(
      `/webhook_subscriptions/${encodeURIComponent(uuid)}`,
      { method: "DELETE" },
    );
  } catch (err) {
    if (!isGone(err)) throw err;
  }
}

/** Verify, parse and normalize one delivery. Signature first; nothing is parsed before it. */
async function ingest(
  raw: { method: string; rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
  now: number,
  extract?: (payload: Record<string, unknown>) => Record<string, unknown>,
): Promise<ResourceEvent> {
  if (raw.method.toUpperCase() !== "POST") {
    throw new Error(`Calendly delivers webhooks with POST, not ${raw.method}.`);
  }
  const body = await verifySignature(raw, secret, now);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("Calendly delivery refused: the body is not JSON.");
  }
  return normalizeResource(parsed, extract);
}

export interface ResourceTriggerSpec {
  key: string;
  title: string;
  description: string;
  event: string;
  /** Scopes the vendor allows for this event (default both). */
  organizationOnly?: boolean;
  extraOutput?: OutputField[];
  extract?: (payload: Record<string, unknown>) => Record<string, unknown>;
  sample: ResourceEvent;
}

/** One named non-invitee event (event types, routing forms). */
export function resourceTrigger(
  spec: ResourceTriggerSpec,
  now: () => number = Date.now,
): TriggerDefinition<TriggerParams, ResourceEvent, ResourceState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.organizationOnly ? [SIGNING_KEY_PARAM] : [SCOPE_PARAM, SIGNING_KEY_PARAM],
    output: [...BASE_OUTPUT, ...(spec.extraOutput ?? []), PAYLOAD_OUTPUT],
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      return await register(
        [spec.event],
        spec.organizationOnly ? { ...params, scope: "organization" } : params,
        callbackUrl,
        ctx,
      );
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      return await unregister(state, ctx);
    },

    async handleIngest({ raw, params, state }) {
      const event = await ingest(raw, params?.signingKey || state?.secret, now(), spec.extract);
      return event.event === spec.event ? [event] : [];
    },
  };
}

/** The Any-event trigger: one subscription for the events listed in the `events` param. */
export function anyEventTrigger(
  now: () => number = Date.now,
): TriggerDefinition<ResourceParams, ResourceEvent, ResourceState> {
  return {
    key: "any-event",
    title: "Any Event",
    description:
      "Fires for any Calendly event you choose (bookings, cancellations, no-shows, event type changes, routing form submissions, contacts, meeting recaps). The run gets the event name, who created it, the resource URI and the full payload.",
    params: [EVENTS_PARAM, SCOPE_PARAM, SIGNING_KEY_PARAM],
    output: [...BASE_OUTPUT, PAYLOAD_OUTPUT],
    sample: {
      event: "event_type.updated",
      createdAt: "2026-11-10T10:00:00.000000Z",
      createdBy: "https://api.calendly.com/users/AAAAAAAAAAAAAAAA",
      uri: "https://api.calendly.com/event_types/AAAAAAAAAAAAAAAA",
      name: "30 Minute Meeting",
      email: null,
      payload: {
        uri: "https://api.calendly.com/event_types/AAAAAAAAAAAAAAAA",
        name: "30 Minute Meeting",
        active: true,
      },
    },

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      return await register(parseEvents(params.events), params, callbackUrl, ctx);
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      return await unregister(state, ctx);
    },

    async handleIngest({ raw, params, state }) {
      const event = await ingest(raw, params?.signingKey || state?.secret, now());
      const wanted = state?.events ?? parseEvents(params?.events);
      return wanted.includes(event.event) ? [event] : [];
    },
  };
}
