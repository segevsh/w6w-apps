import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";
import { ExaApiError, ExaClient } from "./client.ts";

/**
 * Exa Websets webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` registers a webhook for ONE event type with `POST /websets/v0/webhooks`; Exa
 *     answers with the signing `secret` exactly once, and the host keeps it in subscription state
 *     (D5: the vendor chooses the secret). `onUnsubscribe` deletes the webhook by id; one Exa no
 *     longer has counts as deleted.
 *   - `handleIngest` verifies `Exa-Signature` (`t=<unix seconds>,v1=<hex>`; `v1` is the HMAC-SHA256
 *     of `<t>.<raw body>` under the secret) BEFORE it parses anything, rejects a timestamp outside
 *     the five-minute window, then emits one event.
 *
 * Docs (verified 2026-11-10): https://exa.ai/docs/websets/api/webhooks/create-a-webhook ,
 * https://exa.ai/docs/websets/api/webhooks/verifying-signatures and
 * https://exa.ai/docs/websets/api/events/types
 */

export interface TriggerParams {
  /** Only deliver events for this Webset; blank = every Webset on the account. */
  websetId?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  secret: string;
}

/** The run's `trigger.event`: one Websets event. */
export interface WebsetEvent {
  eventId: string | null;
  type: string;
  createdAt: string | null;
  websetId: string | null;
  itemId: string | null;
  data: Record<string, unknown>;
}

const WEBSET_PARAM: Param = {
  key: "websetId",
  label: "Webset ID",
  type: "string",
  required: false,
  hint: "Only fire for this Webset. Leave blank to fire for every Webset on the account.",
};

const OUTPUT: OutputField[] = [
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "type", type: "string", label: "Event Type" },
  { key: "createdAt", type: "string", label: "Created At" },
  { key: "websetId", type: "string", label: "Webset ID" },
  { key: "itemId", type: "string", label: "Item ID" },
  { key: "data", type: "object", label: "Resource (the item for item events)" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

const webhookPath = (id?: string) =>
  id === undefined ? "/websets/v0/webhooks" : `/websets/v0/webhooks/${encodeURIComponent(id)}`;

/** True for the "no such webhook" answers `ExaClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof ExaApiError && (err.status === 404 || err.status === 410);
}

/** The delivery body → its event. Throws on a body that is not an Exa event. */
export function normalizeDelivery(body: unknown): WebsetEvent {
  const e = asObject(body);
  const type = str(e?.type);
  if (!e || !type || e.object !== "event") {
    throw new Error("Not an Exa webhook delivery: expected an `event` object with a `type`.");
  }
  const data = asObject(e.data) ?? {};
  const isItem = type.startsWith("webset.item.");
  return {
    eventId: str(e.id),
    type,
    createdAt: str(e.createdAt),
    websetId: str(data.websetId) ?? (type.startsWith("webset.") && !isItem ? str(data.id) : null),
    itemId: isItem ? str(data.id) : null,
    data,
  };
}

/**
 * Check `Exa-Signature` against the exact bytes received and the clock. Throws (never echoing the
 * secret, the signature or the header) unless it verifies; an unset secret is refused before any
 * compare. Returns the verified body text.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
  nowMs: number = Date.now(),
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const given = header(raw, "exa-signature");
  if (given === undefined || given === "") {
    throw new Error("Exa delivery refused: the Exa-Signature header is missing.");
  }
  let timestamp: string | undefined;
  const signatures: string[] = [];
  for (const part of given.split(",")) {
    const at = part.indexOf("=");
    if (at < 0) continue;
    const name = part.slice(0, at).trim();
    const value = part.slice(at + 1).trim();
    if (name === "t") timestamp = value;
    else if (name === "v1") signatures.push(value);
  }
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) {
    throw new Error("Exa delivery refused: the Exa-Signature header is malformed.");
  }
  if (!withinTolerance(Number(timestamp), nowMs)) {
    throw new Error("Exa delivery refused: the signature timestamp is outside the allowed window.");
  }
  const expected = await hmac("SHA-256", key, `${timestamp}.${body}`, "hex");
  let ok = false;
  for (const sig of signatures) if (timingSafeEqual(expected, sig)) ok = true;
  if (!ok) throw new Error("Exa delivery refused: the signature does not match.");
  return body;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The Websets event type this trigger subscribes to (and keeps). */
  eventType: string;
  sample: WebsetEvent;
}

/** Build one Exa Websets event webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, WebsetEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [WEBSET_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    async onSubscribe({ subscriptionId, callbackUrl }, ctx: HookContext) {
      const created = await new ExaClient(ctx).request<{ id?: unknown; secret?: unknown }>(
        webhookPath(),
        {
          method: "POST",
          body: {
            events: [spec.eventType],
            url: callbackUrl,
            metadata: { source: "w6w", subscription: String(subscriptionId).slice(0, 200) },
          },
        },
      );
      const webhookId = str(created?.id);
      const secret = str(created?.secret);
      if (!webhookId) throw new Error("Exa did not return the id of the webhook it created.");
      if (!secret) {
        // A webhook whose deliveries could not be verified is never kept.
        try {
          await new ExaClient(ctx).request(webhookPath(webhookId), { method: "DELETE" });
        } catch { /* best-effort cleanup */ }
        throw new Error(
          "Exa did not return a signing secret, so deliveries could not be verified.",
        );
      }
      return { webhookId, secret };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.webhookId) return;
      try {
        await new ExaClient(ctx).request(webhookPath(s.webhookId), { method: "DELETE" });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, params, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Exa delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, state?.secret);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Exa delivery refused: the body is not JSON.");
      }
      const event = normalizeDelivery(parsed);
      if (event.type !== spec.eventType) return [];
      const only = params?.websetId?.trim();
      if (only && event.websetId !== only) return [];
      return [event];
    },
  };
}
