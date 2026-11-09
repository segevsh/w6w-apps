import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { ClickUpClient } from "./client.ts";

/**
 * ClickUp webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` creates a Workspace (team) webhook for the trigger's events, optionally
 *     narrowed to one space, folder or list. ClickUp returns the webhook's own `secret` in the
 *     create response; it is kept in the subscription state.
 *   - `handleIngest` verifies `X-Signature` (hex HMAC-SHA256 of the raw body, keyed by that
 *     secret) before it parses anything. ClickUp signs every delivery, so none is accepted
 *     unsigned.
 *   - `onUnsubscribe` deletes the webhook; one ClickUp no longer has counts as deleted.
 *
 * Docs (verified 2026-11-09): https://developer.clickup.com/docs/webhooks ,
 * https://developer.clickup.com/docs/webhooksignature ,
 * https://developer.clickup.com/reference/createwebhook
 */

export interface TriggerParams {
  teamId?: string;
  spaceId?: string;
  folderId?: string;
  listId?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  secret: string;
  teamId: string;
  events: string[];
}

/** The run's `trigger.event`: one delivery. */
export interface TaskEvent {
  event: string;
  taskId: string | null;
  listId: string | null;
  folderId: string | null;
  spaceId: string | null;
  webhookId: string | null;
  /** `webhook_id:history_item_id` of the first history item, ClickUp's documented idempotency key. */
  idempotencyKey: string | null;
  historyItems: unknown[];
}

export const EVENT_OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event" },
  { key: "taskId", type: "string", label: "Task ID" },
  { key: "listId", type: "string", label: "List ID" },
  { key: "folderId", type: "string", label: "Folder ID" },
  { key: "spaceId", type: "string", label: "Space ID" },
  { key: "webhookId", type: "string", label: "Webhook ID" },
  { key: "idempotencyKey", type: "string", label: "Idempotency key" },
  { key: "historyItems", type: "array", label: "History items" },
];

export const EVENT_SAMPLE: TaskEvent = {
  event: "taskCreated",
  taskId: "c0j",
  listId: "162641285",
  folderId: null,
  spaceId: null,
  webhookId: "7fa3ec74-69a8-4530-a251-8a13730bd204",
  idempotencyKey: "7fa3ec74-69a8-4530-a251-8a13730bd204:2800763136717140857",
  historyItems: [{ id: "2800763136717140857", field: "status", parent_id: "162641285" }],
};

const PARAMS: Param[] = [
  {
    key: "teamId",
    label: "Workspace ID",
    type: "string",
    required: true,
    hint:
      "The ClickUp Workspace (API: team) ID — the number after /v2/team/ in the API or in the app URL.",
  },
  {
    key: "spaceId",
    label: "Space ID",
    type: "string",
    hint: "Only fire for this Space. Leave all four location fields blank for the whole Workspace.",
  },
  {
    key: "folderId",
    label: "Folder ID",
    type: "string",
    hint: "Only fire for this Folder (the most specific location set wins).",
  },
  {
    key: "listId",
    label: "List ID",
    type: "string",
    hint: "Only fire for this List (the most specific location set wins).",
  },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** ClickUpClient throws `ClickUp <status> …`; a 404/410 means the webhook is already gone. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^ClickUp (404|410) /.test(err.message);
}

/** A location id as the integer ClickUp's create-webhook schema asks for. */
function locationId(label: string, v: string | undefined): number | undefined {
  const s = v?.trim();
  if (!s) return undefined;
  if (!/^\d+$/.test(s)) throw new Error(`${label} must be a number, got "${s}".`);
  return Number(s);
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The ClickUp events this trigger registers for and accepts. */
  events: string[];
}

/** Build one ClickUp webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, TaskEvent, Partial<TriggerState>> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: PARAMS,
    output: EVENT_OUTPUT,
    sample: { ...EVENT_SAMPLE, event: spec.events[0] },

    async onSubscribe({ params, callbackUrl }, ctx) {
      const teamId = params.teamId?.trim();
      if (!teamId || !/^\d+$/.test(teamId)) {
        throw new Error("Set Workspace ID to a ClickUp team ID.");
      }
      const body: Record<string, unknown> = {
        endpoint: callbackUrl,
        events: spec.events,
        space_id: locationId("Space ID", params.spaceId),
        folder_id: locationId("Folder ID", params.folderId),
        list_id: locationId("List ID", params.listId),
      };
      const created = await new ClickUpClient(ctx).request<
        { id?: unknown; webhook?: { id?: unknown; secret?: unknown } }
      >(`/team/${teamId}/webhook`, { method: "POST", body });
      const webhookId = str(created?.id) ?? str(created?.webhook?.id);
      const secret = str(created?.webhook?.secret);
      if (!webhookId) throw new Error("ClickUp created the webhook but returned no id.");
      if (!secret) {
        // Without the secret no delivery could be verified: undo the registration and say so.
        await new ClickUpClient(ctx).request(`/webhook/${encodeURIComponent(webhookId)}`, {
          method: "DELETE",
        }).catch(() => {});
        throw new Error("ClickUp created the webhook but returned no secret to verify with.");
      }
      return { webhookId, secret, teamId, events: spec.events };
    },

    async onUnsubscribe({ state }, ctx) {
      const webhookId = str(state?.webhookId);
      if (!webhookId) return;
      try {
        await new ClickUpClient(ctx).request(`/webhook/${encodeURIComponent(webhookId)}`, {
          method: "DELETE",
        });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`ClickUp delivers webhooks with POST, not ${raw.method}.`);
      }
      const secret = requireSecret(state?.secret);
      const body = requireRawBody(raw);
      const signature = header(raw, "x-signature");
      if (!signature) throw new Error("ClickUp delivery refused: the X-Signature is missing.");
      const expected = await hmac("SHA-256", secret, body, "hex");
      if (!timingSafeEqual(expected, signature.toLowerCase())) {
        throw new Error("ClickUp delivery refused: the signature does not match.");
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("ClickUp delivery is not valid JSON.");
      }
      const d = asObject(parsed);
      const event = str(d?.event);
      if (!d || !event) throw new Error("ClickUp delivery has no event name.");
      const webhookId = str(d.webhook_id);
      if (state?.webhookId && webhookId && webhookId !== state.webhookId) {
        throw new Error("ClickUp delivery is for another webhook, not this subscription's.");
      }
      if (!spec.events.includes(event)) return [];
      const historyItems = Array.isArray(d.history_items) ? d.history_items : [];
      const firstId = str(asObject(historyItems[0])?.id);
      return [{
        event,
        taskId: str(d.task_id),
        listId: str(d.list_id),
        folderId: str(d.folder_id),
        spaceId: str(d.space_id),
        webhookId,
        idempotencyKey: webhookId && firstId ? `${webhookId}:${firstId}` : null,
        historyItems,
      }];
    },
  };
}
