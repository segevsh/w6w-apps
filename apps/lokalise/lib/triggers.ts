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
  /** Any-event trigger only: comma-separated Lokalise event names; empty = all of them. */
  events?: string;
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

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  hint:
    "Comma-separated Lokalise event names (e.g. project.key.added, project.task.closed). Leave empty for every event the webhook API can subscribe to. A bulk name such as project.keys.added is delivered when you list its singular event.",
  placeholder: "project.key.added, project.task.closed",
};

/**
 * Every event `POST /projects/{id}/webhooks` accepts (the `events` enum of the create-a-webhook
 * reference, verified 2026-11-10). Lokalise has no "all events" wildcard, so the Any-event trigger
 * with an empty `events` param subscribes to this list.
 */
export const ALL_EVENTS: string[] = [
  "project.branch.added",
  "project.branch.deleted",
  "project.branch.merged",
  "project.contributor.added",
  "project.contributor.deleted",
  "project.deleted",
  "project.exported",
  "project.imported",
  "project.key.added",
  "project.key.comment.added",
  "project.key.modified",
  "project.keys.deleted",
  "project.language.settings_changed",
  "project.languages.added",
  "project.snapshot",
  "project.task.closed",
  "project.task.created",
  "project.task.deleted",
  "project.task.language.closed",
  "project.translation.proofread",
  "project.translation.updated",
  "team.order.completed",
  "team.order.created",
  "team.order.deleted",
];

/**
 * Bulk variants Lokalise sends for a subscribed singular event (webhook-events reference): the
 * subscription names the singular event, the delivery may carry the bulk name.
 */
export const BULK_OF: Record<string, string> = {
  "project.key.added": "project.keys.added",
  "project.key.modified": "project.keys.modified",
  "project.translation.updated": "project.translations.updated",
  "project.translation.proofread": "project.translations.proofread",
};
const SINGULAR_OF: Record<string, string> = Object.fromEntries(
  Object.entries(BULK_OF).map(([one, many]) => [many, one]),
);

const EVENT_NAME = /^(project|team)\.[a-z_]+(\.[a-z_]+)*$/;

/** Parse the Any-event `events` param: trimmed, de-duplicated names; throws on a malformed name. */
export function parseEvents(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  const names = raw.split(",").map((n) => n.trim()).filter((n) => n !== "");
  for (const n of names) {
    if (!EVENT_NAME.test(n)) {
      throw new Error(`"${n}" is not a Lokalise event name (expected e.g. project.key.added).`);
    }
  }
  return [...new Set(names)];
}

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

/** The body fields that carry an event's own object(s), in the order they are looked for. */
const RECORD_FIELDS = [
  "key",
  "keys",
  "translation",
  "translations",
  "task",
  "comment",
  "contributor",
  "languages",
  "language",
  "import",
];

/** The verified delivery → its event, or null for the setup ping (no `event`). */
export function normalizeDelivery(
  parsed: Record<string, unknown>,
  recordFrom: string[] = RECORD_FIELDS,
): LokaliseEvent | null {
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
    record: recordFrom.map((f) => parsed[f]).find((v) => v !== undefined && v !== null) ?? null,
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
  /** Body fields holding the event's object, first present wins (default: all of them in order). */
  recordFrom?: string[];
  /**
   * The Any-event trigger: adds an `events` param. Empty subscribes to every event the API accepts
   * and lets every delivery through; a list subscribes to (and keeps) just those events.
   */
  any?: boolean;
}

/** Build one Lokalise webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, LokaliseEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.any
      ? [PROJECT_ID_PARAM, EVENTS_PARAM, BRANCH_PARAM]
      : [PROJECT_ID_PARAM, BRANCH_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const projectId = params.projectId?.trim();
      if (!projectId) throw new Error("Choose the Lokalise project to watch.");
      const branch = params.branch?.trim();
      let events = spec.subscribeTo;
      if (spec.any) {
        const wanted = parseEvents(params.events);
        events = wanted.length > 0
          ? [...new Set(wanted.map((n) => SINGULAR_OF[n] ?? n))]
          : ALL_EVENTS;
      }
      const res = await new LokaliseClient(ctx).json<
        { webhook?: { webhook_id?: unknown; secret?: unknown } } | undefined
      >(hooksPath(projectId), {
        method: "POST",
        body: {
          url: callbackUrl,
          events,
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

    handleIngest({ raw, state, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Lokalise delivers webhooks with POST, not ${raw.method}.`);
      }
      const parsed = verifyDelivery(raw, (state as Partial<TriggerState> | undefined)?.secret);
      const event = normalizeDelivery(parsed, spec.recordFrom);
      if (!event) return []; // the ping Lokalise sends when a webhook is created
      if (!spec.any) return spec.accept.includes(event.event) ? [event] : [];
      const wanted = parseEvents((params as TriggerParams | undefined)?.events);
      if (wanted.length === 0) return [event];
      const keep = new Set(wanted.flatMap((n) => [n, BULK_OF[n] ?? n, SINGULAR_OF[n] ?? n]));
      return keep.has(event.event) ? [event] : [];
    },
  };
}
