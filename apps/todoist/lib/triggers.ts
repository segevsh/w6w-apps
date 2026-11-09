import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";

/**
 * Todoist webhook triggers (rfcs/trigger.md, webhook form, manual receiver).
 *
 *   - Todoist webhooks are configured per app in the App Console, not through the REST API, so
 *     `onSubscribe` makes no Todoist call: it hands back the `callbackUrl` the user pastes there and
 *     `onUnsubscribe` is a no-op.
 *   - `handleIngest` verifies `X-Todoist-Hmac-SHA256` (base64 HMAC-SHA256 of the exact request body
 *     under the app's client secret, D5 (2)) BEFORE it parses anything, then emits one event.
 *
 * Docs (verified 2026-11-09): https://developer.todoist.com/sync/v9/#webhooks
 */

export interface TriggerParams {
  signingSecret?: string;
}

/** The run's `trigger.event`: one Todoist webhook event. */
export interface TodoistEvent {
  eventName: string;
  userId: string | null;
  triggeredAt: string | null;
  deliveryId: string | null;
  itemId: string | null;
  data: Record<string, unknown>;
}

const SIGNING_SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "Client Secret",
  type: "secret",
  required: true,
  hint:
    "Todoist App Console, your app, App Management, Client Secret. Todoist signs every delivery with it; a delivery that does not verify is refused.",
};

const OUTPUT: OutputField[] = [
  { key: "eventName", type: "string", label: "Event Name" },
  { key: "userId", type: "string", label: "User ID" },
  { key: "triggeredAt", type: "string", label: "Triggered At" },
  { key: "deliveryId", type: "string", label: "Delivery ID" },
  { key: "itemId", type: "string", label: "Task ID" },
  { key: "data", type: "object", label: "Event Data (the task)" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** The delivery body → its event. Throws on a body that is not a Todoist event. */
export function normalizeDelivery(body: unknown, deliveryId: string | null): TodoistEvent {
  const d = asObject(body);
  const eventName = str(d?.event_name);
  if (!d || !eventName) throw new Error("Not a Todoist webhook delivery: expected `event_name`.");
  const data = asObject(d.event_data) ?? {};
  return {
    eventName,
    userId: str(d.user_id),
    triggeredAt: str(d.triggered_at),
    deliveryId,
    itemId: str(data.id),
    data,
  };
}

/**
 * Check `X-Todoist-Hmac-SHA256` against the exact bytes received. Throws (never echoing the secret,
 * the signature or the header) unless it matches; an unset secret is refused before any compare.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const given = header(raw, "x-todoist-hmac-sha256");
  if (given === undefined || given === "") {
    throw new Error("Todoist delivery refused: the X-Todoist-Hmac-SHA256 header is missing.");
  }
  const expected = await hmac("SHA-256", key, body, "base64");
  if (!timingSafeEqual(expected, given)) {
    throw new Error("Todoist delivery refused: the signature does not match.");
  }
  return body;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  eventName: string;
  sample: TodoistEvent;
}

/** Build one Todoist event webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, TodoistEvent, { callbackUrl: string }> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [SIGNING_SECRET_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Todoist delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, params?.signingSecret);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Todoist delivery refused: the body is not JSON.");
      }
      const event = normalizeDelivery(parsed, header(raw, "x-todoist-delivery-id") ?? null);
      if (event.eventName !== spec.eventName) return [];
      return [event];
    },
  };
}
