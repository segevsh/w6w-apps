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
  | "NEW_TASK";

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
