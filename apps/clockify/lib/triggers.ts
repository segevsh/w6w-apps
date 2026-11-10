import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { ClockifyClient } from "./client.ts";

/**
 * Clockify webhook triggers (rfcs/trigger.md, webhook form) on `/workspaces/{id}/webhooks`.
 *
 *   - `onSubscribe` finds the workspace (the param, else the account's only one), deletes any
 *     webhook already pointed at the host's `callbackUrl`, then creates a workspace-scoped webhook
 *     for the trigger's event. Clockify generates a per-webhook token at creation (`authToken`)
 *     and "will always" send it in a request header; it is kept in the subscription state
 *     (the planner's survey names the header `Clockify-Signature`).
 *   - `onUnsubscribe` deletes the webhook; one Clockify no longer has counts as deleted.
 *   - `handleIngest` reads the raw body, requires the stored token to exist, and refuses any
 *     delivery whose `Clockify-Signature` header differs (constant-time compare). The token is a
 *     shared secret sent with every delivery — not an HMAC of the body.
 */

export type ClockifyEvent =
  | "NEW_TIME_ENTRY"
  | "NEW_TIMER_STARTED"
  | "TIMER_STOPPED"
  | "NEW_PROJECT"
  | "NEW_CLIENT"
  | "NEW_TASK"
  | "TIME_ENTRY_UPDATED"
  | "TIME_ENTRY_DELETED"
  | "PROJECT_UPDATED"
  | "PROJECT_DELETED"
  | "CLIENT_UPDATED"
  | "CLIENT_DELETED"
  | "TASK_UPDATED"
  | "TASK_DELETED";

export interface TriggerParams {
  workspaceId?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  workspaceId: string;
  authToken: string;
  webhookEvent: ClockifyEvent;
}

const WORKSPACE_PARAM: Param = {
  key: "workspaceId",
  label: "Workspace ID",
  type: "string",
  hint: "The workspace to watch. Leave blank when the account has exactly one workspace.",
};

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

async function resolveWorkspace(client: ClockifyClient, params: TriggerParams): Promise<string> {
  const given = params.workspaceId?.trim();
  if (given) return given;
  const listed = await client.request<Array<{ id?: unknown }>>("/workspaces");
  const ids = (Array.isArray(listed) ? listed : []).map((w) => str(w.id)).filter((
    id,
  ): id is string => !!id);
  if (ids.length !== 1) {
    throw new Error(
      ids.length === 0
        ? "This Clockify account has no workspace to register a webhook on."
        : `This Clockify account has ${ids.length} workspaces: set Workspace ID to the one to watch.`,
    );
  }
  return ids[0];
}

async function deleteWebhook(client: ClockifyClient, workspaceId: string, id: string) {
  try {
    await client.request(
      `/workspaces/${encodeURIComponent(workspaceId)}/webhooks/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  } catch (err) {
    if (/^Clockify (404|410) /.test(String((err as Error)?.message))) return;
    throw err;
  }
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  webhookEvent: ClockifyEvent;
  output: OutputField[];
  /** The event body Clockify delivers (the record itself). */
  sample: Record<string, unknown>;
}

/** Build one Clockify webhook trigger. The emitted event is the delivered record, as-is. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, Record<string, unknown>, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [WORKSPACE_PARAM],
    output: spec.output,
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const client = new ClockifyClient(ctx);
      const workspaceId = await resolveWorkspace(client, params);
      const base = `/workspaces/${encodeURIComponent(workspaceId)}/webhooks`;
      const listed = await client.request<
        | { webhooks?: Array<{ id?: unknown; url?: unknown }> }
        | Array<{ id?: unknown; url?: unknown }>
      >(base);
      const existing = Array.isArray(listed) ? listed : listed?.webhooks ?? [];
      for (const w of existing) {
        const id = str(w.id);
        if (id && w.url === callbackUrl) await deleteWebhook(client, workspaceId, id);
      }
      const created = await client.request<{ id?: unknown; authToken?: unknown }>(base, {
        method: "POST",
        body: {
          name: `w6w ${spec.key}`,
          url: callbackUrl,
          webhookEvent: spec.webhookEvent,
          triggerSourceType: "WORKSPACE_ID",
          triggerSource: [workspaceId],
        },
      });
      const webhookId = str(created?.id);
      const authToken = str(created?.authToken);
      if (!webhookId || !authToken) {
        throw new Error("Clockify created the webhook but returned no id or token.");
      }
      return { webhookId, workspaceId, authToken, webhookEvent: spec.webhookEvent };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      if (state?.webhookId && state.workspaceId) {
        await deleteWebhook(new ClockifyClient(ctx), state.workspaceId, state.webhookId);
      }
    },

    handleIngest({ raw, state }) {
      const expected = requireSecret(state?.authToken);
      const body = requireRawBody(raw);
      const given = header(raw, "clockify-signature");
      if (typeof given !== "string" || given === "") {
        throw new Error("Clockify delivery refused: the signature header is missing.");
      }
      if (!timingSafeEqual(given, expected)) {
        throw new Error("Clockify delivery refused: the signature does not match.");
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Clockify delivery refused: the body is not JSON.");
      }
      const record = asObject(parsed);
      if (!record) throw new Error("Not a Clockify webhook delivery: expected a JSON object.");
      // Clockify names the event in a header; a verified delivery for another event is not ours.
      const eventHeader = header(raw, "clockify-webhook-event-type");
      if (eventHeader !== undefined && eventHeader !== spec.webhookEvent) return [];
      return [record];
    },
  };
}

/**
 * Every `webhookEvent` Clockify's "Create webhook" accepts
 * (https://docs.clockify.me/ `POST /v1/workspaces/{workspaceId}/webhooks`, enum read 2026-11-10).
 */
export const CLOCKIFY_EVENTS: readonly string[] = [
  "NEW_PROJECT",
  "NEW_TASK",
  "NEW_CLIENT",
  "NEW_TIMER_STARTED",
  "TIMER_STOPPED",
  "TIME_ENTRY_UPDATED",
  "TIME_ENTRY_DELETED",
  "TIME_ENTRY_SPLIT",
  "NEW_TIME_ENTRY",
  "TIME_ENTRY_RESTORED",
  "NEW_TAG",
  "USER_DELETED_FROM_WORKSPACE",
  "USER_JOINED_WORKSPACE",
  "USER_DEACTIVATED_ON_WORKSPACE",
  "USER_ACTIVATED_ON_WORKSPACE",
  "USER_EMAIL_CHANGED",
  "USER_UPDATED",
  "NEW_INVOICE",
  "INVOICE_UPDATED",
  "NEW_APPROVAL_REQUEST",
  "APPROVAL_REQUEST_STATUS_UPDATED",
  "TIME_OFF_REQUESTED",
  "TIME_OFF_REQUEST_UPDATED",
  "TIME_OFF_REQUEST_APPROVED",
  "TIME_OFF_REQUEST_REJECTED",
  "TIME_OFF_REQUEST_STARTED",
  "TIME_OFF_REQUEST_WITHDRAWN",
  "BALANCE_UPDATED",
  "TAG_UPDATED",
  "TAG_DELETED",
  "TASK_UPDATED",
  "CLIENT_UPDATED",
  "TASK_DELETED",
  "CLIENT_DELETED",
  "EXPENSE_RESTORED",
  "ASSIGNMENT_CREATED",
  "ASSIGNMENT_DELETED",
  "ASSIGNMENT_PUBLISHED",
  "ASSIGNMENT_UPDATED",
  "EXPENSE_CREATED",
  "EXPENSE_DELETED",
  "EXPENSE_UPDATED",
  "PROJECT_UPDATED",
  "PROJECT_DELETED",
  "USER_GROUP_CREATED",
  "USER_GROUP_UPDATED",
  "USER_GROUP_DELETED",
  "USERS_INVITED_TO_WORKSPACE",
  "LIMITED_USERS_ADDED_TO_WORKSPACE",
  "COST_RATE_UPDATED",
  "BILLABLE_RATE_UPDATED",
];

export interface AnyEventParams {
  workspaceId?: string;
  /** Comma-separated Clockify webhook event names. */
  events?: string;
}

export interface AnyEventState {
  workspaceId: string;
  webhooks: Array<{ id: string; authToken: string; event: string }>;
}

/** Split and validate the `events` param against Clockify's catalog. */
export function parseEvents(raw: string | undefined): string[] {
  const names = [
    ...new Set(
      (raw ?? "").split(",").map((s) => s.trim().toUpperCase()).filter((s) => s !== ""),
    ),
  ];
  if (names.length === 0) {
    throw new Error(
      "Clockify registers one webhook per event: name at least one event (comma-separated), e.g. NEW_TAG,USER_JOINED_WORKSPACE.",
    );
  }
  const unknown = names.filter((n) => !CLOCKIFY_EVENTS.includes(n));
  if (unknown.length > 0) {
    throw new Error(`Unknown Clockify webhook event(s): ${unknown.join(", ")}.`);
  }
  return names;
}

/**
 * The Any-event trigger. Clockify's create-webhook call takes ONE `webhookEvent`, so `onSubscribe`
 * registers one webhook per name in `events` (all pointing at the same callback URL, each with its
 * own token); a delivery is accepted when its `Clockify-Signature` equals ANY stored token. The
 * emitted event is the delivered record plus `webhookEvent` (from `Clockify-Webhook-Event-Type`,
 * when sent).
 */
export function anyEventTrigger(spec: {
  key: string;
  title: string;
  description: string;
  output: OutputField[];
  sample: Record<string, unknown>;
}): TriggerDefinition<AnyEventParams, Record<string, unknown>, AnyEventState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [
      WORKSPACE_PARAM,
      {
        key: "events",
        label: "Events",
        type: "string",
        required: true,
        hint:
          "Comma-separated Clockify webhook events, e.g. NEW_TAG,USER_JOINED_WORKSPACE,INVOICE_UPDATED. Clockify creates one webhook per event (3 on the Free plan), so name only the ones you need.",
      },
    ],
    output: spec.output,
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const events = parseEvents(params.events);
      const client = new ClockifyClient(ctx);
      const workspaceId = await resolveWorkspace(client, params);
      const base = `/workspaces/${encodeURIComponent(workspaceId)}/webhooks`;
      const listed = await client.request<
        | { webhooks?: Array<{ id?: unknown; url?: unknown }> }
        | Array<{ id?: unknown; url?: unknown }>
      >(base);
      const existing = Array.isArray(listed) ? listed : listed?.webhooks ?? [];
      for (const w of existing) {
        const id = str(w.id);
        if (id && w.url === callbackUrl) await deleteWebhook(client, workspaceId, id);
      }
      const webhooks: AnyEventState["webhooks"] = [];
      try {
        for (const event of events) {
          const created = await client.request<{ id?: unknown; authToken?: unknown }>(base, {
            method: "POST",
            body: {
              name: `w6w ${spec.key} ${event}`,
              url: callbackUrl,
              webhookEvent: event,
              triggerSourceType: "WORKSPACE_ID",
              triggerSource: [workspaceId],
            },
          });
          const id = str(created?.id);
          const authToken = str(created?.authToken);
          if (!id || !authToken) {
            throw new Error("Clockify created the webhook but returned no id or token.");
          }
          webhooks.push({ id, authToken, event });
        }
      } catch (err) {
        for (const w of webhooks) {
          try {
            await deleteWebhook(client, workspaceId, w.id);
          } catch {
            // best effort: report the original failure.
          }
        }
        throw err;
      }
      return { workspaceId, webhooks };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      if (!state?.workspaceId || !Array.isArray(state.webhooks)) return;
      const client = new ClockifyClient(ctx);
      for (const w of state.webhooks) await deleteWebhook(client, state.workspaceId, w.id);
    },

    handleIngest({ raw, state }) {
      const tokens = (Array.isArray(state?.webhooks) ? state.webhooks : []).map((w) =>
        requireSecret(w?.authToken)
      );
      if (tokens.length === 0) requireSecret(undefined);
      const body = requireRawBody(raw);
      const given = header(raw, "clockify-signature");
      if (typeof given !== "string" || given === "") {
        throw new Error("Clockify delivery refused: the signature header is missing.");
      }
      // Compare against every stored token (no early exit).
      let ok = false;
      for (const t of tokens) if (timingSafeEqual(given, t)) ok = true;
      if (!ok) throw new Error("Clockify delivery refused: the signature does not match.");
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Clockify delivery refused: the body is not JSON.");
      }
      const record = asObject(parsed);
      if (!record) throw new Error("Not a Clockify webhook delivery: expected a JSON object.");
      const eventHeader = header(raw, "clockify-webhook-event-type");
      if (eventHeader === undefined) return [record];
      const wanted = new Set(state.webhooks.map((w) => w.event));
      if (!wanted.has(eventHeader)) return [];
      return [{ ...record, webhookEvent: eventHeader }];
    },
  };
}
