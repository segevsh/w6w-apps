import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { AsanaClient } from "./client.ts";

/**
 * Asana webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` creates a webhook on a project, filtered to one task action. Asana completes
 *     a handshake DURING that create call: it POSTs the callback URL with an `X-Hook-Secret`
 *     header and waits for the same header echoed back. The handshake lands in `handleIngest`
 *     while the subscription has no stored state yet, so that is the only moment it echoes. The
 *     signing secret then comes back in the create response, and `onSubscribe` keeps it.
 *   - `handleIngest` verifies `X-Hook-Signature` (hex HMAC-SHA256 of the raw body, keyed by the
 *     stored secret) before it parses anything, then emits one event per entry in `events`.
 *     A delivery with no stored secret and no handshake header is refused: Asana signs, so an
 *     unsigned delivery is never accepted.
 *   - `onUnsubscribe` deletes the webhook; one Asana no longer has counts as deleted.
 *
 * Docs (verified 2026-11-10): https://developers.asana.com/docs/webhooks-guide
 */

export type TaskAction = "added" | "changed" | "deleted";

export interface TriggerParams {
  projectId?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  secret: string;
  projectId: string;
  action: TaskAction;
}

/** The run's `trigger.event`: one entry of a delivery's `events` array. */
export interface TaskEvent {
  taskId: string;
  action: string;
  createdAt: string | null;
  userId: string | null;
  parentId: string | null;
  field: string | null;
  change: Record<string, unknown> | null;
  resourceSubtype: string | null;
}

export const EVENT_OUTPUT: OutputField[] = [
  { key: "taskId", type: "string", label: "Task ID" },
  { key: "action", type: "string", label: "Action" },
  { key: "createdAt", type: "string", label: "Event time" },
  { key: "userId", type: "string", label: "Changed by (user ID)" },
  { key: "parentId", type: "string", label: "Parent ID" },
  { key: "field", type: "string", label: "Changed field" },
  { key: "change", type: "object", label: "Change" },
  { key: "resourceSubtype", type: "string", label: "Task type" },
];

export const EVENT_SAMPLE: TaskEvent = {
  taskId: "1200000000000001",
  action: "added",
  createdAt: "2026-11-09T10:00:00.000Z",
  userId: "1200000000000002",
  parentId: "1200000000000003",
  field: null,
  change: null,
  resourceSubtype: "default_task",
};

const PROJECT_PARAM: Param = {
  key: "projectId",
  label: "Project ID",
  type: "string",
  required: true,
  hint: "The project to watch. Find it in the project's URL: app.asana.com/0/<project id>/…",
};

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** AsanaClient throws `Asana <status> <text> for …`; a 404/410 means the webhook is already gone. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^Asana (404|410) /.test(err.message);
}

/** A handshake header is echoed back verbatim, so only a plain token is accepted. */
const HANDSHAKE_SECRET = /^[A-Za-z0-9_.~+\/=-]{8,512}$/;

async function deleteWebhook(client: AsanaClient, webhookId: string): Promise<void> {
  try {
    await client.request(`/webhooks/${encodeURIComponent(webhookId)}`, { method: "DELETE" });
  } catch (err) {
    if (!isGone(err)) throw err;
  }
}

/** The signing secret in a create response: the documented top-level `X-Hook-Secret` key. */
function secretOf(created: unknown): string | null {
  const o = asObject(created);
  if (!o) return null;
  for (const [k, v] of Object.entries(o)) {
    if (k.toLowerCase() === "x-hook-secret") return str(v);
  }
  return null;
}

/** What a verified delivery holds: the registration handshake to echo, or the events array. */
type Received = { handshake: string } | { entries: unknown[] };

type RawDelivery = Parameters<typeof requireRawBody>[0] & Parameters<typeof header>[0];

/**
 * The one place a delivery is trusted: handshake (only while the subscription has no stored
 * secret), then `X-Hook-Signature` over the raw body, THEN the JSON is parsed. Both builders below
 * go through it, so no trigger can accept an unsigned delivery.
 */
async function receive(raw: RawDelivery, stored: string | undefined): Promise<Received> {
  const handshake = header(raw, "x-hook-secret");
  if (stored === undefined || stored === "") {
    // Registration in progress: the one request Asana sends before the secret is stored.
    if (handshake !== undefined && HANDSHAKE_SECRET.test(handshake)) return { handshake };
    throw new Error("Asana delivery refused: this subscription has no signing secret yet.");
  }
  const secret = requireSecret(stored);
  const body = requireRawBody(raw);
  const signature = header(raw, "x-hook-signature");
  if (!signature) throw new Error("Asana delivery refused: the X-Hook-Signature is missing.");
  const expected = await hmac("SHA-256", secret, body, "hex");
  if (!timingSafeEqual(expected, signature.toLowerCase())) {
    throw new Error("Asana delivery refused: the signature does not match.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("Asana delivery is not valid JSON.");
  }
  const events = asObject(parsed)?.events;
  if (!Array.isArray(events)) throw new Error("Asana delivery has no events array.");
  return { entries: events };
}

/** One entry of a delivery's `events` → the run's event, or `null` for an entry with no task. */
export function normalizeEvent(entry: unknown): TaskEvent | null {
  const e = asObject(entry);
  const resource = asObject(e?.resource);
  const taskId = str(resource?.gid);
  if (!e || !resource || !taskId || resource.resource_type !== "task") return null;
  const change = asObject(e.change);
  return {
    taskId,
    action: str(e.action) ?? "",
    createdAt: str(e.created_at),
    userId: str(asObject(e.user)?.gid),
    parentId: str(asObject(e.parent)?.gid),
    field: str(change?.field),
    change,
    resourceSubtype: str(resource.resource_subtype),
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  action: TaskAction;
}

/** Build one Asana task webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, TaskEvent, Partial<TriggerState>> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [PROJECT_PARAM],
    output: EVENT_OUTPUT,
    sample: { ...EVENT_SAMPLE, action: spec.action },

    async onSubscribe({ params, callbackUrl }, ctx) {
      const projectId = params.projectId?.trim();
      if (!projectId) throw new Error("Set Project ID to the Asana project to watch.");
      const client = new AsanaClient(ctx);
      const created = await client.request<{ gid?: unknown }>("/webhooks", {
        method: "POST",
        body: {
          resource: projectId,
          target: callbackUrl,
          filters: [{ resource_type: "task", action: spec.action }],
        },
      });
      const webhookId = str(created?.data?.gid);
      const secret = secretOf(created);
      if (!secret) {
        // Without the secret no delivery could be verified: undo the registration and say so.
        if (webhookId) await deleteWebhook(client, webhookId).catch(() => {});
        throw new Error("Asana created the webhook but returned no X-Hook-Secret to verify with.");
      }
      if (!webhookId) throw new Error("Asana created the webhook but returned no gid.");
      return { webhookId, secret, projectId, action: spec.action };
    },

    async onUnsubscribe({ state }, ctx) {
      const webhookId = str(state?.webhookId);
      if (webhookId) await deleteWebhook(new AsanaClient(ctx), webhookId);
    },

    async handleIngest({ raw, state }) {
      const got = await receive(raw, state?.secret);
      if ("handshake" in got) {
        return { events: [], response: { headers: { "x-hook-secret": got.handshake } } };
      }
      // An empty `events` is Asana's heartbeat: acknowledged, nothing to run.
      const out: TaskEvent[] = [];
      for (const entry of got.entries) {
        const e = normalizeEvent(entry);
        if (e && (!state?.action || e.action === state.action)) out.push(e);
      }
      return out;
    },
  };
}

// ---- Other resource types: stories (comments), projects, and the Any-event trigger -----------------

/** One Asana webhook filter: https://developers.asana.com/reference/createwebhook (WebhookFilter). */
export interface ResourceFilter {
  resource_type: string;
  resource_subtype?: string;
  action: "added" | "changed" | "deleted" | "removed" | "undeleted";
}

export interface ResourceTriggerParams {
  /** Project trigger: the project to watch. */
  projectId?: string;
  /** Workspace trigger: the workspace or organization to watch. */
  workspaceId?: string;
  /** Any-event trigger: the project, team, portfolio, goal or workspace gid. */
  resourceId?: string;
  /** Any-event trigger: comma-separated `resource_type.action` names; empty means every event. */
  events?: string;
}

export interface ResourceTriggerState {
  webhookId: string;
  secret: string;
  resourceId: string;
  /** The `resource_type.action` names registered; empty means no filter (every event). */
  events: string[];
}

/** The run's `trigger.event` for every non-task trigger: one entry of a delivery's `events`. */
export interface ResourceEvent {
  /** `resource_type.action`, e.g. `story.added`. */
  event: string;
  resourceId: string;
  resourceType: string;
  resourceSubtype: string | null;
  action: string;
  createdAt: string | null;
  userId: string | null;
  parentId: string | null;
  parentType: string | null;
  field: string | null;
  change: Record<string, unknown> | null;
}

export const RESOURCE_OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event (resource type and action)" },
  { key: "resourceId", type: "string", label: "Resource ID" },
  { key: "resourceType", type: "string", label: "Resource type" },
  { key: "resourceSubtype", type: "string", label: "Resource subtype" },
  { key: "action", type: "string", label: "Action" },
  { key: "createdAt", type: "string", label: "Event time" },
  { key: "userId", type: "string", label: "Changed by (user ID)" },
  { key: "parentId", type: "string", label: "Parent ID" },
  { key: "parentType", type: "string", label: "Parent type" },
  { key: "field", type: "string", label: "Changed field" },
  { key: "change", type: "object", label: "Change" },
];

export const RESOURCE_SAMPLE: ResourceEvent = {
  event: "story.added",
  resourceId: "1200000000000004",
  resourceType: "story",
  resourceSubtype: "comment_added",
  action: "added",
  createdAt: "2026-11-10T10:00:00.000Z",
  userId: "1200000000000002",
  parentId: "1200000000000001",
  parentType: "task",
  field: null,
  change: null,
};

const WORKSPACE_PARAM: Param = {
  key: "workspaceId",
  label: "Workspace ID",
  type: "string",
  required: true,
  hint: "The workspace or organization to watch. GET /workspaces lists the ids you can use.",
};

const RESOURCE_PARAM: Param = {
  key: "resourceId",
  label: "Resource ID",
  type: "string",
  required: true,
  hint:
    "The project, team, portfolio, goal or workspace to watch. A team, portfolio, goal or workspace needs the Events list below.",
};

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  hint:
    "Comma-separated <resource type>.<action> names, for example task.added,story.added,section.changed. Actions: added, changed, deleted, removed, undeleted. Blank delivers every event the resource produces (projects only). See https://developers.asana.com/docs/webhooks-guide",
};

const EVENT_NAME = /^[a-z][a-z_]{0,63}\.(added|changed|deleted|removed|undeleted)$/;

/** The Any-event list → names and the filters Asana is asked for. Blank → no filter. */
function parseEvents(v: string | undefined): { names: string[]; filters: ResourceFilter[] } {
  const names = [...new Set((v ?? "").split(",").map((e) => e.trim()).filter(Boolean))];
  const bad = names.filter((n) => !EVENT_NAME.test(n));
  if (bad.length > 0) {
    throw new Error(
      `Events must look like task.added or story.changed (resource type, dot, action); got: ${
        bad.join(", ")
      }.`,
    );
  }
  return {
    names,
    filters: names.map((n) => {
      const [resource_type, action] = n.split(".");
      return { resource_type, action: action as ResourceFilter["action"] };
    }),
  };
}

/** One entry of a delivery's `events` → the run's event, or `null` for an entry with no resource. */
export function normalizeResourceEvent(entry: unknown): ResourceEvent | null {
  const e = asObject(entry);
  const resource = asObject(e?.resource);
  const resourceId = str(resource?.gid);
  const resourceType = str(resource?.resource_type);
  const action = str(e?.action);
  if (!e || !resource || !resourceId || !resourceType || !action) return null;
  const change = asObject(e.change);
  const parent = asObject(e.parent);
  return {
    event: `${resourceType}.${action}`,
    resourceId,
    resourceType,
    resourceSubtype: str(resource.resource_subtype),
    action,
    createdAt: str(e.created_at),
    userId: str(asObject(e.user)?.gid),
    parentId: str(parent?.gid),
    parentType: str(parent?.resource_type),
    field: str(change?.field),
    change,
  };
}

export interface ResourceTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** Where the webhook is registered: a project, a workspace, or any resource (Any event). */
  scope: "project" | "workspace" | "any";
  /** The filters this trigger registers and accepts; empty when `scope` is `any`. */
  filters: ResourceFilter[];
  sample?: Partial<ResourceEvent>;
}

/** Build one Asana webhook trigger for stories, projects or any resource type. */
export function resourceTrigger(
  spec: ResourceTriggerSpec,
): TriggerDefinition<ResourceTriggerParams, ResourceEvent, Partial<ResourceTriggerState>> {
  const params = spec.scope === "project"
    ? [PROJECT_PARAM]
    : spec.scope === "workspace"
    ? [WORKSPACE_PARAM]
    : [RESOURCE_PARAM, EVENTS_PARAM];
  const fixedNames = spec.filters.map((f) => `${f.resource_type}.${f.action}`);
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params,
    output: RESOURCE_OUTPUT,
    sample: { ...RESOURCE_SAMPLE, ...spec.sample },

    async onSubscribe({ params, callbackUrl }, ctx) {
      const raw = spec.scope === "project"
        ? params.projectId
        : spec.scope === "workspace"
        ? params.workspaceId
        : params.resourceId;
      const resourceId = raw?.trim();
      if (!resourceId) {
        throw new Error(
          spec.scope === "workspace"
            ? "Set Workspace ID to the Asana workspace to watch."
            : spec.scope === "project"
            ? "Set Project ID to the Asana project to watch."
            : "Set Resource ID to the Asana resource to watch.",
        );
      }
      const chosen = spec.scope === "any"
        ? parseEvents(params.events)
        : { names: fixedNames, filters: spec.filters };
      const client = new AsanaClient(ctx);
      const created = await client.request<{ gid?: unknown }>("/webhooks", {
        method: "POST",
        body: {
          resource: resourceId,
          target: callbackUrl,
          ...(chosen.filters.length > 0 ? { filters: chosen.filters } : {}),
        },
      });
      const webhookId = str(created?.data?.gid);
      const secret = secretOf(created);
      if (!secret) {
        // Without the secret no delivery could be verified: undo the registration and say so.
        if (webhookId) await deleteWebhook(client, webhookId).catch(() => {});
        throw new Error("Asana created the webhook but returned no X-Hook-Secret to verify with.");
      }
      if (!webhookId) throw new Error("Asana created the webhook but returned no gid.");
      return { webhookId, secret, resourceId, events: chosen.names };
    },

    async onUnsubscribe({ state }, ctx) {
      const webhookId = str(state?.webhookId);
      if (webhookId) await deleteWebhook(new AsanaClient(ctx), webhookId);
    },

    async handleIngest({ raw, state }) {
      const got = await receive(raw, state?.secret);
      if ("handshake" in got) {
        return { events: [], response: { headers: { "x-hook-secret": got.handshake } } };
      }
      const out: ResourceEvent[] = [];
      for (const entry of got.entries) {
        const e = normalizeResourceEvent(entry);
        if (!e) continue;
        const accepted = spec.scope === "any"
          ? (state?.events ?? []).length === 0 || state!.events!.includes(e.event)
          : spec.filters.some((f) =>
            f.resource_type === e.resourceType && f.action === e.action &&
            (f.resource_subtype === undefined || f.resource_subtype === e.resourceSubtype)
          );
        if (accepted) out.push(e);
      }
      return out;
    },
  };
}
