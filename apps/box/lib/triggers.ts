import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";
import { BoxClient } from "./client.ts";

/**
 * Box webhook (V2) triggers (rfcs/trigger.md, webhook form).
 *
 * Box signs a delivery with `BOX-SIGNATURE-PRIMARY` and `BOX-SIGNATURE-SECONDARY`: base64
 * HMAC-SHA256 over the raw body followed by the `BOX-DELIVERY-TIMESTAMP` header value, keyed by
 * the app's primary and secondary signature keys (Developer Console, Configuration, Webhooks).
 * The keys belong to the Box app, not to one webhook, and cannot be read through the API, so the
 * trigger takes them as secret params (D5 (2)). A delivery is valid when EITHER configured key
 * reproduces its matching header (so a key can be rotated), and it is older than ten minutes at
 * most.
 *
 *   - `onSubscribe` deletes any webhook already pointed at this subscription's `callbackUrl`, then
 *     creates one on the chosen file or folder for the chosen triggers.
 *   - `onUnsubscribe` deletes it; one Box no longer has counts as deleted.
 *   - `handleIngest` verifies the signature over the raw body before it parses anything.
 */

export const DELIVERY_WINDOW_SEC = 600;
const MAX_WEBHOOK_PAGES = 5;

export interface TriggerParams {
  primaryKey?: string;
  secondaryKey?: string;
  targetType?: string;
  targetId?: string;
  triggers?: string;
}

export interface TriggerState {
  webhookId: string;
  targetType: string;
  targetId: string;
  triggers: string[];
}

export interface BoxEvent {
  eventId: string | null;
  trigger: string;
  webhookId: string | null;
  createdAt: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdByLogin: string | null;
  sourceType: string | null;
  sourceId: string | null;
  sourceName: string | null;
  source: Record<string, unknown> | null;
}

const PRIMARY_KEY_PARAM: Param = {
  key: "primaryKey",
  label: "Primary Signature Key",
  type: "secret",
  required: true,
  hint:
    "Box Developer Console, your app, Configuration, Webhooks, Primary Key. Box signs every delivery with it; a delivery that does not verify is refused.",
};

const SECONDARY_KEY_PARAM: Param = {
  key: "secondaryKey",
  label: "Secondary Signature Key",
  type: "secret",
  advanced: true,
  hint:
    "Optional. Box signs with both keys, so a delivery verifies with either; set this while you rotate the primary key.",
};

const TARGET_TYPE_PARAM: Param = {
  key: "targetType",
  label: "Watch a",
  type: "select",
  default: "folder",
  options: [{ value: "folder", label: "Folder" }, { value: "file", label: "File" }],
};

const TARGET_ID_PARAM: Param = {
  key: "targetId",
  label: "Folder or file ID",
  type: "string",
  required: true,
  hint:
    "The Box id of the item to watch. The root folder (0) cannot have a webhook: pick a folder inside it.",
};

const TRIGGERS_PARAM: Param = {
  key: "triggers",
  label: "Box triggers",
  type: "string",
  required: true,
  hint:
    "Comma-separated Box webhook triggers, e.g. FILE.UPLOADED,FILE.DELETED,COMMENT.CREATED. The full list is in Box's webhook triggers reference.",
};

export const EVENT_OUTPUT: OutputField[] = [
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "trigger", type: "string", label: "Trigger" },
  { key: "webhookId", type: "string", label: "Webhook ID" },
  { key: "createdAt", type: "string", label: "Created At" },
  { key: "createdById", type: "string", label: "Actor ID" },
  { key: "createdByName", type: "string", label: "Actor Name" },
  { key: "createdByLogin", type: "string", label: "Actor Login" },
  { key: "sourceType", type: "string", label: "Item Type" },
  { key: "sourceId", type: "string", label: "Item ID" },
  { key: "sourceName", type: "string", label: "Item Name" },
  { key: "source", type: "object", label: "Item" },
];

export const FILE_UPLOADED_SAMPLE: BoxEvent = {
  eventId: "4cf9a2de-9fa6-4de3-ae35-8c4b9bf1e0d4",
  trigger: "FILE.UPLOADED",
  webhookId: "1234567890",
  createdAt: "2026-01-01T12:00:00-08:00",
  createdById: "11446498",
  createdByName: "Alex Example",
  createdByLogin: "alex@example.com",
  sourceType: "file",
  sourceId: "987654321",
  sourceName: "report.pdf",
  source: { id: "987654321", type: "file", name: "report.pdf" },
};

/** The sample for a fixed-trigger watcher: the upload sample, retargeted at the trigger's item. */
function sampleFor(trigger: string): BoxEvent {
  if (trigger === "FILE.UPLOADED") return FILE_UPLOADED_SAMPLE;
  const folder = trigger.startsWith("FOLDER.");
  const sourceName = folder ? "Invoices" : "report.pdf";
  const sourceId = folder ? "55501234" : FILE_UPLOADED_SAMPLE.sourceId;
  const sourceType = folder ? "folder" : "file";
  return {
    ...FILE_UPLOADED_SAMPLE,
    trigger,
    sourceType,
    sourceId,
    sourceName,
    source: { id: sourceId, type: sourceType, name: sourceName },
  };
}

/** `FILE.UPLOADED` style names, and the dot-less Doc Gen names (`DOCGEN_DOCUMENT_GENERATION_STARTED`). */
const TRIGGER_NAME = /^(?:[A-Z][A-Z_]*\.[A-Z][A-Z_]*|DOCGEN_[A-Z_]+)$/;

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

function parseTriggers(value: string | undefined): string[] {
  const names = [...new Set((value ?? "").split(",").map((s) => s.trim().toUpperCase()))]
    .filter(Boolean);
  if (names.length === 0) throw new Error("Choose at least one Box trigger.");
  const bad = names.filter((n) => !TRIGGER_NAME.test(n));
  if (bad.length > 0) {
    throw new Error(`Not a Box trigger name (expected e.g. FILE.UPLOADED): ${bad.join(", ")}`);
  }
  return names;
}

/** The HTTP status in a `BoxClient` error message ("Box 404 Not Found for …"), if any. */
function statusOf(err: unknown): number | null {
  const m = /^Box (\d{3}) /.exec(err instanceof Error ? err.message : "");
  return m ? Number(m[1]) : null;
}

async function deleteWebhook(client: BoxClient, id: string): Promise<void> {
  try {
    await client.request(`/webhooks/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (err) {
    const status = statusOf(err);
    if (status === 404 || status === 410) return;
    throw err;
  }
}

async function webhooksPointingAt(client: BoxClient, address: string): Promise<string[]> {
  const found: string[] = [];
  let marker: string | undefined;
  for (let i = 0; i < MAX_WEBHOOK_PAGES; i++) {
    const res = await client.request<{
      entries?: Array<{ id?: unknown; address?: unknown }>;
      next_marker?: string | null;
    }>("/webhooks", { query: { limit: 100, marker } });
    for (const w of res?.entries ?? []) {
      const id = str(w.id);
      if (id && w.address === address) found.push(id);
    }
    if (!res?.next_marker) break;
    marker = res.next_marker;
  }
  return found;
}

/**
 * Throws unless the delivery is fresh and one of the configured keys reproduces its signature
 * header. Returns the raw body.
 */
export async function verifyBoxSignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  primaryKey: unknown,
  secondaryKey: unknown,
  nowMs: number = Date.now(),
): Promise<string> {
  const primary = requireSecret(primaryKey);
  const secondary = typeof secondaryKey === "string" && secondaryKey !== "" ? secondaryKey : null;
  const body = requireRawBody(raw);
  const timestamp = header(raw, "box-delivery-timestamp");
  if (!timestamp) throw new Error("Box delivery refused: the delivery timestamp is missing.");
  const sentAt = Date.parse(timestamp);
  if (!withinTolerance(sentAt / 1000, nowMs, DELIVERY_WINDOW_SEC)) {
    throw new Error("Box delivery refused: the delivery timestamp is outside the allowed window.");
  }
  const version = header(raw, "box-signature-version");
  const algorithm = header(raw, "box-signature-algorithm");
  if (
    (version !== undefined && version !== "1") ||
    (algorithm !== undefined && algorithm !== "HmacSHA256")
  ) {
    throw new Error("Box delivery refused: the signature scheme is not supported.");
  }
  const message = body + timestamp;
  const candidates: Array<[string, string | undefined]> = [
    [primary, header(raw, "box-signature-primary")],
  ];
  if (secondary) candidates.push([secondary, header(raw, "box-signature-secondary")]);
  let valid = false;
  for (const [key, got] of candidates) {
    if (!got) continue;
    const expected = await hmac("SHA-256", key, message, "base64");
    // No early exit: both keys are always checked, whichever matches first.
    if (timingSafeEqual(expected, got)) valid = true;
  }
  if (!valid) throw new Error("Box delivery refused: the signature does not match.");
  return body;
}

export interface BoxTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The one trigger this fires on, watching a folder; omitted for the trigger whose set is a param. */
  trigger?: string;
}

export function boxTrigger(
  spec: BoxTriggerSpec,
): TriggerDefinition<TriggerParams, BoxEvent, TriggerState> {
  const fixed = spec.trigger;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: fixed
      ? [
        PRIMARY_KEY_PARAM,
        SECONDARY_KEY_PARAM,
        { ...TARGET_ID_PARAM, label: "Folder ID" },
      ]
      : [
        PRIMARY_KEY_PARAM,
        SECONDARY_KEY_PARAM,
        TARGET_TYPE_PARAM,
        TARGET_ID_PARAM,
        TRIGGERS_PARAM,
      ],
    output: EVENT_OUTPUT,
    sample: fixed ? sampleFor(fixed) : {
      ...FILE_UPLOADED_SAMPLE,
      trigger: "FILE.DELETED",
    },

    async onSubscribe({ params, callbackUrl }, ctx) {
      const targetType = fixed ? "folder" : params?.targetType === "file" ? "file" : "folder";
      const targetId = params?.targetId?.trim();
      if (!targetId) throw new Error("Enter the id of the Box folder or file to watch.");
      const triggers = fixed ? [fixed] : parseTriggers(params?.triggers);
      const client = new BoxClient(ctx);
      for (const id of await webhooksPointingAt(client, callbackUrl)) {
        await deleteWebhook(client, id);
      }
      const created = asObject(
        await client.request("/webhooks", {
          method: "POST",
          body: { target: { id: targetId, type: targetType }, address: callbackUrl, triggers },
        }),
      );
      const webhookId = str(created?.id);
      if (!webhookId) throw new Error("Box created the webhook but returned no id.");
      return { webhookId, targetType, targetId, triggers };
    },

    async onUnsubscribe({ state }, ctx) {
      const id = str((state as Partial<TriggerState> | undefined)?.webhookId);
      if (id) await deleteWebhook(new BoxClient(ctx), id);
    },

    async handleIngest({ raw, params, state }) {
      const body = await verifyBoxSignature(raw, params?.primaryKey, params?.secondaryKey);
      let payload: Record<string, unknown> | null;
      try {
        payload = asObject(JSON.parse(body));
      } catch {
        payload = null;
      }
      if (!payload) throw new Error("Box delivery refused: the body is not a JSON object.");
      const trigger = str(payload.trigger);
      if (!trigger) return [];
      const wanted = fixed ? [fixed] : (state as Partial<TriggerState> | undefined)?.triggers ?? [];
      if (wanted.length > 0 && !wanted.includes(trigger)) return [];
      const createdBy = asObject(payload.created_by);
      const source = asObject(payload.source);
      return [{
        eventId: str(payload.id),
        trigger,
        webhookId: str(asObject(payload.webhook)?.id),
        createdAt: str(payload.created_at),
        createdById: str(createdBy?.id),
        createdByName: str(createdBy?.name),
        createdByLogin: str(createdBy?.login),
        sourceType: str(source?.type),
        sourceId: str(source?.id),
        sourceName: str(source?.name),
        source,
      }];
    },

    parseOutput({ normalized }) {
      return normalized as BoxEvent;
    },
  };
}
