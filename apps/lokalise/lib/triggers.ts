import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { encodeId, LokaliseClient } from "./client.ts";

/**
 * Lokalise webhook triggers (rfcs/trigger.md, webhook form, API-registered).
 *
 *   - `onSubscribe` registers the callback URL with `POST /projects/{project_id}/webhooks` for the
 *     trigger's events. Lokalise generates the webhook's `secret` and returns it in that response;
 *     it is kept in the subscription `state` (D5 (1): the vendor chooses, we store).
 *   - `onUnsubscribe` deletes the webhook with `DELETE /projects/{project_id}/webhooks/{webhook_id}`;
 *     one Lokalise no longer has (404) counts as deleted.
 *   - `handleIngest` checks the `X-Secret` header against the stored secret, BEFORE it parses the
 *     body.
 *
 * Trust model: Lokalise does NOT sign requests ("We do not sign the requests", webhook guide). It
 * sends the webhook's secret in the `X-Secret` header of every delivery, so the check is a
 * shared-secret compare in constant time. The secret proves the sender knows it; it does not bind
 * the event data, and a captured delivery could be replayed. Keep the callback URL private too.
 *
 * Docs (verified 2026-11-10): https://developers.lokalise.com/docs/webhooks-guide,
 * https://developers.lokalise.com/docs/webhook-events and
 * https://developers.lokalise.com/reference/create-a-webhook
 */

export interface TriggerParams {
  projectId: string;
  branch?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  projectId: string;
  webhookId: string;
  /** The `X-Secret` value Lokalise sends with every delivery of this webhook. */
  secret: string;
}

/** The run's `trigger.event`: one Lokalise project event. */
export interface LokaliseEvent {
  event: string;
  projectId: string | null;
  projectName: string | null;
  branch: string | null;
  userEmail: string | null;
  userName: string | null;
  createdAt: string | null;
  createdAtTimestamp: number | null;
  /** The event's own object(s): a key, keys, a translation, translations or a task. */
  record: unknown;
  data: Record<string, unknown>;
}

const PROJECT_ID_PARAM: Param = {
  key: "projectId",
  label: "Project ID",
  type: "string",
  required: true,
  hint: "The Lokalise project to watch (Get Many Projects lists them).",
};

const BRANCH_PARAM: Param = {
  key: "branch",
  label: "Branch",
  type: "string",
  advanced: true,
  hint: "Limit deliveries to one branch. Leave empty for every branch.",
};

const OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event (e.g. project.key.added)" },
  { key: "projectId", type: "string", label: "Project ID" },
  { key: "projectName", type: "string", label: "Project name" },
  { key: "branch", type: "string", label: "Branch" },
  { key: "userEmail", type: "string", label: "User email" },
  { key: "userName", type: "string", label: "User name" },
  { key: "createdAt", type: "string", label: "Created at" },
  { key: "createdAtTimestamp", type: "number", label: "Created at (epoch seconds)" },
  { key: "record", type: "object", label: "Key, translation or task (or the bulk list)" },
  { key: "data", type: "object", label: "Full event data" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** True for the "no such webhook" answer `LokaliseClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^Lokalise 404\b/.test(err.message);
}

const hooksPath = (projectId: string, webhookId?: string) =>
  `/projects/${encodeId(projectId)}/webhooks${webhookId ? `/${encodeId(webhookId)}` : ""}`;

/**
 * Check the `X-Secret` header against the stored secret. Throws (never echoing the secret or the
 * header) unless it matches; an unset stored secret is refused before any compare. Returns the
 * parsed body.
 */
export function verifyDelivery(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  storedSecret: unknown,
): Record<string, unknown> {
  const secret = requireSecret(storedSecret);
  const body = requireRawBody(raw);
  const sent = header(raw, "x-secret");
  if (!sent) throw new Error("Lokalise delivery refused: the X-Secret header is missing.");
  if (!timingSafeEqual(sent, secret)) {
    throw new Error("Lokalise delivery refused: the X-Secret header does not match.");
  }
  let parsed: Record<string, unknown> | null;
  try {
    parsed = asObject(JSON.parse(body));
  } catch {
    parsed = null;
  }
  if (!parsed) throw new Error("Not a Lokalise webhook delivery: expected a JSON object.");
  return parsed;
}

/** The verified delivery → its event, or null for the setup ping (no `event`). */
export function normalizeDelivery(parsed: Record<string, unknown>): LokaliseEvent | null {
  const event = str(parsed.event);
  if (!event) return null;
  const project = asObject(parsed.project);
  const user = asObject(parsed.user);
  const ts = Number(parsed.created_at_timestamp);
  return {
    event,
    projectId: str(project?.id),
    projectName: str(project?.name),
    branch: str(project?.branch),
    userEmail: str(user?.email)?.trim() ?? null,
    userName: str(user?.full_name),
    createdAt: str(parsed.created_at),
    createdAtTimestamp: Number.isFinite(ts) && parsed.created_at_timestamp != null ? ts : null,
    record: parsed.key ?? parsed.keys ?? parsed.translation ?? parsed.translations ??
      parsed.task ?? null,
    data: parsed,
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** What `onSubscribe` subscribes to (names `POST .../webhooks` accepts). */
  subscribeTo: string[];
  /** What `handleIngest` lets through: the subscribed names plus their bulk variants. */
  accept: string[];
  sample: LokaliseEvent;
}

/** Build one Lokalise webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, LokaliseEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [PROJECT_ID_PARAM, BRANCH_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const projectId = params.projectId?.trim();
      if (!projectId) throw new Error("Choose the Lokalise project to watch.");
      const branch = params.branch?.trim();
      const res = await new LokaliseClient(ctx).json<
        { webhook?: { webhook_id?: unknown; secret?: unknown } } | undefined
      >(hooksPath(projectId), {
        method: "POST",
        body: {
          url: callbackUrl,
          events: spec.subscribeTo,
          ...(branch ? { branch } : {}),
        },
      });
      const webhookId = str(res?.webhook?.webhook_id);
      const secret = str(res?.webhook?.secret);
      if (!webhookId) throw new Error("Lokalise did not return the new webhook's id.");
      if (!secret) {
        // Never leave a webhook behind whose deliveries could not be verified.
        try {
          await new LokaliseClient(ctx).json(hooksPath(projectId, webhookId), {
            method: "DELETE",
          });
        } catch { /* best-effort rollback */ }
        throw new Error("Lokalise did not return the new webhook's secret.");
      }
      return { projectId, webhookId, secret };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.projectId || !s.webhookId) return;
      try {
        await new LokaliseClient(ctx).json(hooksPath(s.projectId, s.webhookId), {
          method: "DELETE",
        });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Lokalise delivers webhooks with POST, not ${raw.method}.`);
      }
      const parsed = verifyDelivery(raw, (state as Partial<TriggerState> | undefined)?.secret);
      const event = normalizeDelivery(parsed);
      if (!event) return []; // the ping Lokalise sends when a webhook is created
      return spec.accept.includes(event.event) ? [event] : [];
    },
  };
}
