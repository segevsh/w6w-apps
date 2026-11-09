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
 * Docs (verified 2026-11-09):
 *   https://developer.calendly.com/api-docs/overview/webhooks/webhook-signatures
 *   https://developer.calendly.com/api-docs/calendly-api/webhooks/create-webhook-subscription
 */

/** Calendly's documented replay tolerance, in seconds. */
export const TOLERANCE_SEC = 180;

export type CalendlyEvent = "invitee.created" | "invitee.canceled";

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
