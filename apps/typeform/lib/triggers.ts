import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { TypeformClient } from "./client.ts";

/**
 * Typeform webhook trigger (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` registers a webhook on the form with `PUT /forms/{uid}/webhooks/{tag}`,
 *     choosing a random per-subscription `secret` (D5 (1)) that it keeps in subscription state.
 *   - `onUnsubscribe` deletes it; one Typeform no longer has counts as deleted.
 *   - `handleIngest` verifies `Typeform-Signature` (`sha256=` + base64 HMAC-SHA256 of the exact
 *     request body under the secret) BEFORE it parses anything, then emits one event.
 *
 * Docs (verified 2026-11-10): https://www.typeform.com/developers/webhooks/,
 * https://www.typeform.com/developers/webhooks/secure-your-webhooks/ and
 * https://www.typeform.com/developers/webhooks/reference/create-or-update-webhook/
 */

export interface TriggerParams {
  formId: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  formId: string;
  tag: string;
  secret: string;
}

/** The run's `trigger.event`: one submitted response. */
export interface ResponseEvent {
  eventId: string | null;
  eventType: string;
  formId: string | null;
  formTitle: string | null;
  responseId: string | null;
  submittedAt: string | null;
  landedAt: string | null;
  hidden: Record<string, unknown>;
  answers: unknown[];
  calculated: Record<string, unknown> | null;
}

const FORM_PARAM: Param = {
  key: "formId",
  label: "Form ID",
  type: "string",
  required: true,
  hint: "The form to watch: the id in its URL (typeform.com/to/<id>) or from Get Many Forms.",
};

const OUTPUT: OutputField[] = [
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "eventType", type: "string", label: "Event Type" },
  { key: "formId", type: "string", label: "Form ID" },
  { key: "formTitle", type: "string", label: "Form Title" },
  { key: "responseId", type: "string", label: "Response ID (token)" },
  { key: "submittedAt", type: "string", label: "Submitted At" },
  { key: "landedAt", type: "string", label: "Landed At" },
  { key: "hidden", type: "object", label: "Hidden Fields" },
  { key: "answers", type: "array", label: "Answers" },
  { key: "calculated", type: "object", label: "Calculated" },
];

const SAMPLE: ResponseEvent = {
  eventId: "01HZX0Y7WQ6J5C0FJ8K2S4N3PA",
  eventType: "form_response",
  formId: "lT9Z2j",
  formTitle: "Customer feedback",
  responseId: "a3a12ec67a1365927098a606107fac15",
  submittedAt: "2026-11-09T10:15:00Z",
  landedAt: "2026-11-09T10:14:12Z",
  hidden: { utm_source: "newsletter" },
  answers: [
    { type: "text", text: "Great product", field: { id: "Q1", type: "short_text", ref: "q1" } },
  ],
  calculated: { score: 3 },
};

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** A tag Typeform accepts (letters, digits, `_`, `-`) that is unique to the subscription. */
export function tagFor(subscriptionId: string): string {
  const clean = String(subscriptionId).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60);
  return `w6w-${clean || "sub"}`;
}

const webhookPath = (formId: string, tag: string) =>
  `/forms/${encodeURIComponent(formId)}/webhooks/${encodeURIComponent(tag)}`;

/** True for the "no such webhook / form" answers `TypeformClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^Typeform (404|410)\b/.test(err.message);
}

/** The delivery body → its event. Throws on a body that is not a Typeform form response. */
export function normalizeDelivery(body: unknown): ResponseEvent {
  const delivery = asObject(body);
  const fr = asObject(delivery?.form_response);
  if (!delivery || !fr) {
    throw new Error("Not a Typeform webhook delivery: expected `form_response`.");
  }
  return {
    eventId: str(delivery.event_id),
    eventType: str(delivery.event_type) ?? "form_response",
    formId: str(fr.form_id),
    formTitle: str(asObject(fr.definition)?.title),
    responseId: str(fr.token),
    submittedAt: str(fr.submitted_at),
    landedAt: str(fr.landed_at),
    hidden: asObject(fr.hidden) ?? {},
    answers: Array.isArray(fr.answers) ? fr.answers : [],
    calculated: asObject(fr.calculated),
  };
}

/**
 * Check `Typeform-Signature` against the exact bytes received. Throws (never echoing the secret,
 * the signature or the header) unless it matches; an unset secret is refused before any compare.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
): Promise<string> {
  const body = requireRawBody(raw);
  const key = requireSecret(secret);
  const given = header(raw, "typeform-signature");
  if (given === undefined || given === "") {
    throw new Error("Typeform delivery refused: the Typeform-Signature header is missing.");
  }
  const expected = `sha256=${await hmac("SHA-256", key, body, "base64")}`;
  if (!timingSafeEqual(expected, given)) {
    throw new Error("Typeform delivery refused: the signature does not match.");
  }
  return body;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
}

/** Build the Typeform response webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, ResponseEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [FORM_PARAM],
    output: OUTPUT,
    sample: SAMPLE,

    async onSubscribe({ params, subscriptionId, callbackUrl }, ctx: HookContext) {
      const formId = params.formId?.trim();
      if (!formId) throw new Error("Choose the Typeform form to watch.");
      const tag = tagFor(subscriptionId);
      const secret = randomSecret();
      await new TypeformClient(ctx).request(webhookPath(formId, tag), {
        method: "PUT",
        body: { url: callbackUrl, enabled: true, secret, verify_ssl: true },
      });
      return { formId, tag, secret };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.formId || !s.tag) return;
      try {
        await new TypeformClient(ctx).request(webhookPath(s.formId, s.tag), { method: "DELETE" });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Typeform delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, state?.secret);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Typeform delivery refused: the body is not JSON.");
      }
      const event = normalizeDelivery(parsed);
      if (state?.formId && event.formId && event.formId !== state.formId) return [];
      return [event];
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Round 3: Typeform's webhook catalog has two events, `form_response` (a submitted response) and
// `form_response_partial` (a started-but-not-submitted response). `new-response` above keeps the
// vendor default; the builder below registers an explicit `event_types` object.
// ---------------------------------------------------------------------------------------------

/** Every key of the webhook `event_types` object (create-or-update-webhook, 2026-11-10). */
export const EVENT_TYPES = ["form_response", "form_response_partial"] as const;

export interface EventTriggerParams extends TriggerParams {
  events?: string;
}

/** `onSubscribe` state of an `eventTrigger` (a superset of `TriggerState`). */
export interface EventTriggerState extends TriggerState {
  events: string[];
}

/** `form_response, form_response_partial` → the validated list; empty = both. */
export function parseEventTypes(input: unknown): string[] {
  if (input === undefined || input === null || input === "") return [...EVENT_TYPES];
  if (typeof input !== "string") {
    throw new Error("Typeform events must be a comma-separated list of event names.");
  }
  const names = [...new Set(input.split(/[\s,]+/).filter((n) => n !== ""))];
  if (names.length === 0) return [...EVENT_TYPES];
  const known: readonly string[] = EVENT_TYPES;
  const unknown = names.filter((n) => !known.includes(n));
  if (unknown.length > 0) {
    throw new Error(
      `Typeform has no webhook event named ${unknown.join(", ")}. Known events: ${
        EVENT_TYPES.join(", ")
      }.`,
    );
  }
  return names;
}

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  hint:
    "Comma-separated Typeform events: form_response (a submitted response), form_response_partial (a started, unsubmitted response). Empty = both.",
};

export interface EventTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** Fixed events, or `null` for the Any-event trigger that reads the `events` param. */
  events: string[] | null;
  sample?: ResponseEvent;
}

/** A webhook trigger that registers an explicit `event_types` list. */
export function eventTrigger(
  spec: EventTriggerSpec,
): TriggerDefinition<EventTriggerParams, ResponseEvent, EventTriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.events === null ? [FORM_PARAM, EVENTS_PARAM] : [FORM_PARAM],
    output: OUTPUT,
    sample: spec.sample ?? SAMPLE,

    async onSubscribe({ params, subscriptionId, callbackUrl }, ctx: HookContext) {
      const formId = params.formId?.trim();
      if (!formId) throw new Error("Choose the Typeform form to watch.");
      const events = spec.events ?? parseEventTypes(params.events);
      const tag = tagFor(subscriptionId);
      const secret = randomSecret();
      await new TypeformClient(ctx).request(webhookPath(formId, tag), {
        method: "PUT",
        body: {
          url: callbackUrl,
          enabled: true,
          secret,
          verify_ssl: true,
          event_types: Object.fromEntries(EVENT_TYPES.map((e) => [e, events.includes(e)])),
        },
      });
      return { formId, tag, secret, events };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<EventTriggerState> | undefined;
      if (!s?.formId || !s.tag) return;
      try {
        await new TypeformClient(ctx).request(webhookPath(s.formId, s.tag), { method: "DELETE" });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, params, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Typeform delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, state?.secret);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Typeform delivery refused: the body is not JSON.");
      }
      const event = normalizeDelivery(parsed);
      if (state?.formId && event.formId && event.formId !== state.formId) return [];
      const wanted = state?.events ?? spec.events ?? parseEventTypes(params?.events);
      return wanted.includes(event.eventType) ? [event] : [];
    },
  };
}
