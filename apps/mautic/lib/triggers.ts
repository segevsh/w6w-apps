import type { OutputField, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { MauticClient, MauticError } from "./client.ts";

/**
 * Mautic webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` generates a per-subscription secret (D5 (1) — the Webhooks REST API accepts a
 *     caller-chosen `secret`), deletes a leftover webhook that already points at the callback
 *     URL, and creates the webhook with `POST /api/hooks/new`. The secret lives in the
 *     subscription state.
 *   - `onUnsubscribe` deletes that webhook; one Mautic no longer has counts as deleted.
 *   - `handleIngest` verifies `Webhook-Signature` — base64(HMAC-SHA256(secret, raw body)) —
 *     BEFORE it parses anything. Mautic always signs, so there is no unsigned path. The scheme
 *     carries no timestamp, so there is no replay window to enforce.
 *   - A delivery is `{ "<event type>": [ {payload}, … ] }`; a queued ("background") delivery
 *     aggregates several payloads and several event types, so one delivery can yield several
 *     events — only the ones of this trigger's event type are emitted.
 *
 * Source: https://devdocs.mautic.org/en/7.1/rest_api/webhooks.html and
 * https://devdocs.mautic.org/en/7.1/webhooks/getting_started.html (verified 2026-11-09).
 */

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  event: string;
  secret: string;
}

/** The stored event: one payload of one verified delivery. */
export interface MauticEvent {
  event: string;
  timestamp: string | null;
  resourceId: string | null;
  resource: Record<string, unknown>;
}

export const EVENT_OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event Type" },
  { key: "timestamp", type: "string", label: "Event Time" },
  { key: "resourceId", type: "string", label: "Contact or Submission ID" },
  { key: "resource", type: "object", label: "Event Payload" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

const refused = (why: string) => new Error(`webhook delivery refused: ${why}`);

async function deleteWebhook(client: MauticClient, id: string): Promise<void> {
  try {
    await client.request(`/hooks/${encodeURIComponent(id)}/delete`, { method: "DELETE" });
  } catch (err) {
    if (err instanceof MauticError && (err.status === 404 || err.status === 410)) return;
    throw err;
  }
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** Mautic event type, e.g. `mautic.lead_post_save_new`. */
  event: string;
  /** Where the record's id sits in one payload. */
  idOf(payload: Record<string, unknown>): unknown;
  sample: MauticEvent;
}

/** Build one Mautic webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<Record<string, never>, MauticEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [],
    output: EVENT_OUTPUT,
    sample: spec.sample,

    async onSubscribe({ subscriptionId, callbackUrl }, ctx) {
      const client = new MauticClient(ctx);
      const name = `w6w ${subscriptionId}`;
      const existing = await client.requestAll<{ id?: unknown; webhookUrl?: unknown }>(
        "/hooks",
        "hooks",
        { query: { search: name } },
      );
      for (const hook of existing) {
        const id = str(hook.id);
        if (id && hook.webhookUrl === callbackUrl) await deleteWebhook(client, id);
      }
      const secret = randomSecret();
      const created = await client.request<{ hook?: { id?: unknown } }>("/hooks/new", {
        method: "POST",
        body: {
          name,
          description: "Created by w6w. Deleted when the trigger is removed.",
          webhookUrl: callbackUrl,
          secret,
          triggers: [spec.event],
          eventsOrderbyDir: "asc",
          isPublished: true,
        },
      });
      const webhookId = str(created?.hook?.id);
      if (!webhookId) throw new Error("Mautic created the webhook but returned no id.");
      return { webhookId, event: spec.event, secret };
    },

    async onUnsubscribe({ state }, ctx) {
      const webhookId = str((state as Partial<TriggerState> | undefined)?.webhookId);
      if (webhookId) await deleteWebhook(new MauticClient(ctx), webhookId);
    },

    async handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Mautic delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = requireRawBody(raw);
      const secret = requireSecret(state?.secret);
      const signature = header(raw, "webhook-signature");
      if (!signature) throw refused("the signature header is missing");
      const expected = await hmac("SHA-256", secret, body, "base64");
      if (!timingSafeEqual(expected, signature)) throw refused("the signature does not match");

      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Mautic delivery body is not valid JSON.");
      }
      const delivery = asObject(parsed);
      const payloads = delivery?.[spec.event];
      if (!Array.isArray(payloads)) return [];
      const events: MauticEvent[] = [];
      for (const p of payloads) {
        const resource = asObject(p);
        if (!resource) continue;
        events.push({
          event: spec.event,
          timestamp: str(resource.timestamp),
          resourceId: str(spec.idOf(resource)),
          resource,
        });
      }
      return events;
    },
  };
}
