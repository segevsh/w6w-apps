import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { AcuityClient } from "./client.ts";

/**
 * Acuity Scheduling webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` registers a dynamic webhook for one appointment event (`POST /webhooks`).
 *   - `onUnsubscribe` deletes it; one Acuity no longer has counts as deleted.
 *   - `handleIngest` verifies `X-Acuity-Signature`: base64 HMAC-SHA256 of the exact request body
 *     (form-encoded `action=…&id=…`) under the account's API key, BEFORE it parses anything.
 *     Acuity signs dynamic webhooks with the user account's API key, which the connection does not
 *     expose to a trigger, so the key is a trigger param (D5 (2)). No timestamp: no replay window.
 *   - `parseOutput` fetches the appointment the notification names (the delivery holds only ids).
 *
 * Docs (verified 2026-11-09): https://developers.acuityscheduling.com/docs/webhooks and
 * https://developers.acuityscheduling.com/page/webhooks-webhooks-webhooks
 */

export type AcuityAction = "scheduled" | "rescheduled" | "canceled";

export interface TriggerParams {
  apiKey: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  action: AcuityAction;
}

/** The stored event: the notification, which names the appointment but does not carry it. */
export interface NormalizedEvent {
  action: string;
  appointmentId: string;
  calendarId: string | null;
  appointmentTypeId: string | null;
}

/** The run's `trigger.event`: the notification plus the appointment it names. */
export interface AppointmentEvent extends NormalizedEvent {
  /** The fetched appointment; `null` when it no longer exists. */
  appointment: Record<string, unknown> | null;
}

const API_KEY_PARAM: Param = {
  key: "apiKey",
  label: "API Key",
  type: "secret",
  required: true,
  hint:
    "Your Acuity API key (Business Settings > Integrations > API). Acuity signs every delivery with it; without it nothing is accepted.",
};

const OUTPUT: OutputField[] = [
  { key: "action", type: "string", label: "Action" },
  { key: "appointmentId", type: "string", label: "Appointment ID" },
  { key: "calendarId", type: "string", label: "Calendar ID" },
  { key: "appointmentTypeId", type: "string", label: "Appointment Type ID" },
  { key: "appointment", type: "object", label: "Appointment" },
];

function sampleFor(action: AcuityAction): AppointmentEvent {
  return {
    action,
    appointmentId: "13",
    calendarId: "1",
    appointmentTypeId: "13",
    appointment: {
      id: 13,
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      datetime: "2026-11-12T15:00:00+0000",
      type: "Consultation",
      calendar: "Main",
      canceled: action === "canceled",
    },
  };
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

/** The form-encoded delivery body → the notification. Throws if it names no appointment. */
export function normalizeDelivery(body: string): NormalizedEvent {
  const form = new URLSearchParams(body);
  const action = form.get("action");
  const id = form.get("id");
  if (!action || !id) {
    throw new Error("Not an Acuity webhook delivery: expected `action` and `id`.");
  }
  return {
    action: action.replace(/^appointment\./, ""),
    appointmentId: id,
    calendarId: form.get("calendarID") || null,
    appointmentTypeId: form.get("appointmentTypeID") || null,
  };
}

/**
 * Verify `X-Acuity-Signature` over the exact bytes received and return them. Throws (never
 * echoing the API key, the signature or the header) on failure; an unset key is refused before any
 * compare.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  apiKey: unknown,
): Promise<string> {
  const body = requireRawBody(raw);
  const key = requireSecret(apiKey);
  const given = header(raw, "x-acuity-signature");
  if (given === undefined || given === "") {
    throw new Error("Acuity delivery refused: the X-Acuity-Signature header is missing.");
  }
  const expected = await hmac("SHA-256", key, body, "base64");
  if (!timingSafeEqual(expected, given.trim())) {
    throw new Error("Acuity delivery refused: the signature does not match.");
  }
  return body;
}

function isGone(err: unknown): boolean {
  return err instanceof Error && /^Acuity Scheduling (404|410)\b/.test(err.message);
}

function isNormalized(v: unknown): v is NormalizedEvent {
  const o = asObject(v);
  return !!o && typeof o.action === "string" && typeof o.appointmentId === "string";
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  action: AcuityAction;
}

/** Build one Acuity appointment webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, NormalizedEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [API_KEY_PARAM],
    output: OUTPUT,
    sample: sampleFor(spec.action),

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      requireSecret(params.apiKey);
      const created = await new AcuityClient(ctx).request<{ id?: unknown }>("/webhooks", {
        method: "POST",
        body: { event: `appointment.${spec.action}`, target: callbackUrl },
      });
      const id = created?.id;
      if (typeof id !== "number" && typeof id !== "string") {
        throw new Error("Acuity created the webhook but returned no id.");
      }
      return { webhookId: String(id), action: spec.action };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const id = (state as Partial<TriggerState> | undefined)?.webhookId;
      if (!id) return;
      try {
        await new AcuityClient(ctx).request(`/webhooks/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Acuity delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, params?.apiKey);
      const event = normalizeDelivery(body);
      if (event.action !== spec.action) return [];
      return [event];
    },

    async parseOutput({ normalized, call }, ctx): Promise<AppointmentEvent> {
      const event = isNormalized(normalized)
        ? normalized
        : normalizeDelivery(String(asObject(call)?.body ?? ""));
      try {
        const appointment = await new AcuityClient(ctx).request(
          `/appointments/${encodeURIComponent(event.appointmentId)}`,
        );
        return { ...event, appointment: asObject(appointment) };
      } catch (err) {
        if (isGone(err)) return { ...event, appointment: null };
        throw err;
      }
    },
  };
}
