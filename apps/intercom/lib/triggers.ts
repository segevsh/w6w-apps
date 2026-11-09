import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";

/**
 * Intercom webhook triggers (rfcs/trigger.md, webhook form, manual receiver).
 *
 *   - Intercom webhooks are configured per app in the Developer Hub, not through the API, so
 *     `onSubscribe` makes no Intercom call: it hands back the `callbackUrl` the user pastes there
 *     and `onUnsubscribe` is a no-op.
 *   - `handleIngest` verifies `X-Hub-Signature` (`sha1=` + hex HMAC-SHA1 of the exact request body
 *     under the app's client secret, D5 (2)) BEFORE it parses anything, then emits one event.
 *
 * Docs (verified 2026-11-09): https://developers.intercom.com/docs/webhooks and
 * https://developers.intercom.com/docs/webhooks/webhook-models
 */

export interface TriggerParams {
  signingSecret?: string;
}

/** The run's `trigger.event`: one Intercom notification. */
export interface IntercomEvent {
  notificationId: string | null;
  topic: string;
  appId: string | null;
  createdAt: number | null;
  itemId: string | null;
  item: Record<string, unknown>;
}

const SIGNING_SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "Client Secret",
  type: "secret",
  required: true,
  hint:
    "Intercom Developer Hub, your app, Basic information, Client secret. Intercom signs every delivery with it; a delivery that does not verify is refused.",
};

const OUTPUT: OutputField[] = [
  { key: "notificationId", type: "string", label: "Notification ID" },
  { key: "topic", type: "string", label: "Topic" },
  { key: "appId", type: "string", label: "App ID" },
  { key: "createdAt", type: "number", label: "Created At (epoch seconds)" },
  { key: "itemId", type: "string", label: "Item ID" },
  { key: "item", type: "object", label: "Item (conversation or contact)" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** The delivery body → its event. Throws on a body that is not an Intercom notification. */
export function normalizeDelivery(body: unknown): IntercomEvent {
  const n = asObject(body);
  const topic = str(n?.topic);
  if (!n || !topic) throw new Error("Not an Intercom webhook delivery: expected `topic`.");
  const item = asObject(asObject(n.data)?.item) ?? {};
  return {
    notificationId: str(n.id),
    topic,
    appId: str(n.app_id),
    createdAt: typeof n.created_at === "number" ? n.created_at : null,
    itemId: str(item.id),
    item,
  };
}

/**
 * Check `X-Hub-Signature` against the exact bytes received. Throws (never echoing the secret, the
 * signature or the header) unless it matches; an unset secret is refused before any compare.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const given = header(raw, "x-hub-signature");
  if (given === undefined || given === "") {
    throw new Error("Intercom delivery refused: the X-Hub-Signature header is missing.");
  }
  const expected = `sha1=${await hmac("SHA-1", key, body, "hex")}`;
  if (!timingSafeEqual(expected, given)) {
    throw new Error("Intercom delivery refused: the signature does not match.");
  }
  return body;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  topic: string;
  sample: IntercomEvent;
}

/** Build one Intercom topic webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, IntercomEvent, { callbackUrl: string }> {
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
        throw new Error(`Intercom delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, params?.signingSecret);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Intercom delivery refused: the body is not JSON.");
      }
      const event = normalizeDelivery(parsed);
      // Other topics (and Intercom's `ping`) are acknowledged without a run.
      if (event.topic !== spec.topic) return [];
      return [event];
    },
  };
}
