import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";

/**
 * Jira Cloud webhook triggers (rfcs/trigger.md, webhook form, manual receiver).
 *
 *   - Jira's admin webhooks are created in Jira Administration (System, WebHooks). Registering one
 *     through the REST API (`/rest/webhooks/1.0/webhook`) lives outside the `/rest/api/3` client this
 *     app wraps, so `onSubscribe` makes no Jira call: it hands back the `callbackUrl` the user pastes
 *     there and `onUnsubscribe` is a no-op.
 *   - `handleIngest` verifies `X-Hub-Signature` (`sha256=` + hex HMAC-SHA256 of the exact request
 *     body under the webhook's secret, D5 (2)) BEFORE it parses anything. Jira signs only when the
 *     webhook has a secret, so the secret is required here: an unsigned delivery is refused.
 *     The scheme carries no timestamp, so there is no staleness check; Jira retries reuse the
 *     `X-Atlassian-Webhook-Identifier`, which becomes the event's `deliveryId`.
 *
 * Docs (verified 2026-11-10): https://developer.atlassian.com/cloud/jira/platform/webhooks/
 * ("Registering a webhook", "Available webhook events", "Validating webhook deliveries").
 */

export interface TriggerParams {
  signingSecret?: string;
  /** Any Event only: comma-separated `webhookEvent` names to keep; blank keeps every event. */
  events?: string;
}

/** The run's `trigger.event`: one Jira webhook delivery. */
export interface JiraEvent {
  webhookEvent: string;
  timestamp: number | null;
  /** On issue events, Jira's `issue_event_type_name` (`issue_created`, `issue_commented`, …). */
  eventType: string | null;
  deliveryId: string | null;
  user: Record<string, unknown> | null;
  issue: Record<string, unknown> | null;
  comment: Record<string, unknown> | null;
  project: Record<string, unknown> | null;
  changelog: Record<string, unknown> | null;
}

const SIGNING_SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "Webhook secret",
  type: "secret",
  required: true,
  hint:
    "The secret you set on the webhook in Jira Administration, System, WebHooks (use Generate secret). Jira signs every delivery with it; a delivery that does not verify is refused.",
};

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  hint:
    "Comma-separated Jira event names to react to, e.g. `jira:issue_created,sprint_started`. Blank for every event the webhook sends.",
};

const OUTPUT: OutputField[] = [
  { key: "webhookEvent", type: "string", label: "Event name" },
  { key: "timestamp", type: "number", label: "Event time (epoch ms)" },
  { key: "eventType", type: "string", label: "Issue event type" },
  { key: "deliveryId", type: "string", label: "Delivery ID" },
  { key: "user", type: "object", label: "User" },
  { key: "issue", type: "object", label: "Issue" },
  { key: "comment", type: "object", label: "Comment" },
  { key: "project", type: "object", label: "Project" },
  { key: "changelog", type: "object", label: "Changelog" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

/**
 * Check `X-Hub-Signature` (`sha256=<hex>`) against the exact bytes received. Throws (never echoing
 * the secret, the signature or the header) unless it matches; an unset secret is refused before any
 * compare, and any method other than sha256 is refused.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const given = header(raw, "x-hub-signature");
  if (given === undefined || given === "") {
    throw new Error("Jira delivery refused: the X-Hub-Signature header is missing.");
  }
  const expected = `sha256=${await hmac("SHA-256", key, body, "hex")}`;
  if (!timingSafeEqual(expected, given.toLowerCase())) {
    throw new Error("Jira delivery refused: the signature does not match.");
  }
  return body;
}

/** The delivery body and headers to one event. Throws on a body that is not a Jira webhook. */
export function normalizeDelivery(
  body: unknown,
  raw: { headers: Record<string, string> },
): JiraEvent {
  const b = asObject(body);
  const webhookEvent = str(b?.webhookEvent);
  if (!b || !webhookEvent) throw new Error("Not a Jira webhook delivery: expected `webhookEvent`.");
  return {
    webhookEvent,
    timestamp: typeof b.timestamp === "number" ? b.timestamp : null,
    eventType: str(b.issue_event_type_name),
    deliveryId: header(raw, "x-atlassian-webhook-identifier") ?? null,
    user: asObject(b.user),
    issue: asObject(b.issue),
    comment: asObject(b.comment),
    project: asObject(b.project),
    changelog: asObject(b.changelog),
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** Jira `webhookEvent` names this trigger keeps; omit for Any Event. */
  event?: string;
  sample: JiraEvent;
}

/** Build one Jira webhook trigger: a named event, or (no `event`) the Any Event filter. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, JiraEvent, { callbackUrl: string }> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.event ? [SIGNING_SECRET_PARAM] : [SIGNING_SECRET_PARAM, EVENTS_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Jira delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, params?.signingSecret);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Jira delivery refused: the body is not JSON.");
      }
      const event = normalizeDelivery(parsed, raw);
      if (spec.event) return event.webhookEvent === spec.event ? [event] : [];
      const wanted = (params?.events ?? "").split(",").map((e) => e.trim()).filter(Boolean);
      return wanted.length === 0 || wanted.includes(event.webhookEvent) ? [event] : [];
    },
  };
}
