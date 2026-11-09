import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { FigmaClient } from "./client.ts";

/**
 * Figma webhook triggers (webhooks v2, rfcs/trigger.md webhook form).
 *
 *   - `onSubscribe` generates a random `passcode` (D5 (1): Figma accepts a caller-chosen one,
 *     max 100 characters), deletes any webhook already pointed at the host's `callbackUrl` in the
 *     same context, then `POST /v2/webhooks`. Figma answers with a PING event on creation. The
 *     passcode is kept in the subscription's state.
 *   - `onUnsubscribe` deletes the webhook; one Figma no longer has counts as deleted.
 *   - `handleIngest` reads the raw body, requires the stored passcode to be configured, and
 *     refuses any delivery whose `passcode` field differs (constant-time compare). Figma's
 *     passcode is a shared secret echoed in every payload — not an HMAC — so it proves the sender
 *     knows the secret, nothing about the body's integrity. The passcode is stripped from the event.
 */

export type FigmaEventType =
  | "FILE_UPDATE"
  | "FILE_DELETE"
  | "FILE_VERSION_UPDATE"
  | "FILE_COMMENT"
  | "LIBRARY_PUBLISH";

export interface TriggerParams {
  context?: string;
  contextId?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  passcode: string;
  eventType: FigmaEventType;
  context: string;
  contextId: string;
}

/** One delivery, normalized: the common fields plus everything event-specific under `data`. */
export interface FigmaEvent {
  eventType: string;
  webhookId: string | null;
  fileKey: string | null;
  fileName: string | null;
  timestamp: string | null;
  triggeredBy: Record<string, unknown> | null;
  data: Record<string, unknown>;
}

const CONTEXTS = ["team", "project", "file"] as const;

const CONTEXT_PARAMS: Param[] = [
  {
    key: "context",
    label: "Watch a",
    type: "select",
    required: true,
    default: "file",
    options: CONTEXTS.map((c) => ({ value: c, label: c })),
    hint: "Whether the ID below is a team, a project or a single file.",
  },
  {
    key: "contextId",
    label: "Team, project or file ID",
    type: "string",
    required: true,
    hint: "The team or project ID, or the file key (the part of a file URL after /design/).",
  },
];

export const EVENT_OUTPUT: OutputField[] = [
  { key: "eventType", type: "string", label: "Event type" },
  { key: "webhookId", type: "string", label: "Webhook ID" },
  { key: "fileKey", type: "string", label: "File key" },
  { key: "fileName", type: "string", label: "File name" },
  { key: "timestamp", type: "string", label: "Event time (UTC ISO 8601)" },
  { key: "triggeredBy", type: "object", label: "Triggered by (id, handle)" },
  { key: "data", type: "object", label: "Event-specific fields" },
];

const BASE_KEYS = new Set([
  "event_type",
  "passcode",
  "webhook_id",
  "file_key",
  "file_name",
  "timestamp",
  "triggered_by",
]);

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

async function deleteWebhook(client: FigmaClient, id: string): Promise<void> {
  try {
    await client.request(`/v2/webhooks/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (err) {
    if (/^Figma (404|410) /.test(String((err as Error)?.message))) return;
    throw err;
  }
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  eventType: FigmaEventType;
  sample: FigmaEvent;
}

type Ingest = NonNullable<
  TriggerDefinition<TriggerParams, FigmaEvent, TriggerState>["handleIngest"]
>;

/** Build one Figma webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, FigmaEvent, TriggerState> {
  const handleIngest: Ingest = ({ raw, state }) => {
    // The configured passcode must exist before anything is compared with it.
    const expected = requireSecret(state?.passcode);
    const body = requireRawBody(raw);
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new Error("Figma delivery refused: the body is not JSON.");
    }
    const delivery = asObject(parsed);
    if (!delivery || !timingSafeEqual(delivery.passcode as string, expected)) {
      throw new Error("Figma delivery refused: the passcode does not match.");
    }
    const eventType = str(delivery.event_type);
    // Debug PING on creation, or an event type this trigger did not ask for.
    if (eventType !== spec.eventType) return [];
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(delivery)) if (!BASE_KEYS.has(k)) data[k] = v;
    return [{
      eventType,
      webhookId: str(delivery.webhook_id),
      fileKey: str(delivery.file_key),
      fileName: str(delivery.file_name),
      timestamp: str(delivery.timestamp),
      triggeredBy: asObject(delivery.triggered_by),
      data,
    }];
  };

  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: CONTEXT_PARAMS,
    output: EVENT_OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const context = params.context?.trim() || "file";
      const contextId = params.contextId?.trim();
      if (!(CONTEXTS as readonly string[]).includes(context)) {
        throw new Error(`Unknown Figma context "${context}": use team, project or file.`);
      }
      if (!contextId) throw new Error("Set the team, project or file ID to watch.");

      const client = new FigmaClient(ctx);
      const listed = await client.request<
        { webhooks?: Array<{ id?: unknown; endpoint?: unknown }> }
      >(
        "/v2/webhooks",
        { query: { context, context_id: contextId } },
      );
      for (const w of listed?.webhooks ?? []) {
        const id = str(w.id);
        if (id && w.endpoint === callbackUrl) await deleteWebhook(client, id);
      }
      const passcode = randomSecret();
      const created = await client.request<{ id?: unknown }>("/v2/webhooks", {
        method: "POST",
        body: {
          event_type: spec.eventType,
          context,
          context_id: contextId,
          endpoint: callbackUrl,
          passcode,
          description: `w6w ${spec.key}`,
        },
      });
      const webhookId = str(created?.id);
      if (!webhookId) throw new Error("Figma created the webhook but returned no id.");
      return { webhookId, passcode, eventType: spec.eventType, context, contextId };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      if (state?.webhookId) await deleteWebhook(new FigmaClient(ctx), state.webhookId);
    },

    handleIngest,
  };
}
