import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { BitbucketClient, type BitbucketListResponse } from "./client.ts";

/**
 * Bitbucket Cloud repository-webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` registers a repository webhook pointed at the host's `callbackUrl` with a
 *     per-subscription random secret (D5 (1)), after deleting any webhook already pointed there.
 *     The secret lives in subscription state.
 *   - `onUnsubscribe` deletes that webhook; one Bitbucket no longer has counts as deleted.
 *   - `handleIngest` verifies `X-Hub-Signature` (`sha256=` + hex HMAC-SHA256 of the raw body)
 *     BEFORE parsing anything, then keeps only the event key (`X-Event-Key`) the trigger is for.
 *     Bitbucket only signs when the webhook has a secret, which `onSubscribe` always sets; a
 *     delivery with no signature or no secret on record is refused. The signature covers the body
 *     alone: Bitbucket sends no signed timestamp, so there is no replay window to enforce.
 *
 * Docs (verified 2026-11-09): https://support.atlassian.com/bitbucket-cloud/docs/manage-webhooks/
 * (secure webhooks), https://support.atlassian.com/bitbucket-cloud/docs/event-payloads/ (headers,
 * event keys) and the repository webhooks REST resource, `POST /2.0/repositories/{workspace}/{repo_slug}/hooks`.
 */

export interface TriggerParams {
  workspace?: string;
  repoSlug?: string;
  /** Any-event trigger only: comma-separated event keys (empty = every key below). */
  events?: string;
}

/**
 * Every event key Bitbucket's own registry lists for the repository subject (`GET
 * https://api.bitbucket.org/2.0/hook_events/repository`, read 2026-11-10). `repo:transfer` and
 * `repo:deleted` are workspace-webhook events only, so a repository webhook must not subscribe them.
 */
export const EVENT_KEYS = [
  "repo:push",
  "repo:fork",
  "repo:updated",
  "repo:commit_comment_created",
  "repo:commit_status_created",
  "repo:commit_status_updated",
  "issue:created",
  "issue:updated",
  "issue:comment_created",
  "pullrequest:created",
  "pullrequest:push",
  "pullrequest:updated",
  "pullrequest:approved",
  "pullrequest:unapproved",
  "pullrequest:fulfilled",
  "pullrequest:rejected",
  "pullrequest:comment_created",
  "pullrequest:comment_updated",
  "pullrequest:comment_deleted",
  "pullrequest:comment_resolved",
  "pullrequest:comment_reopened",
  "pullrequest:changes_request_created",
  "pullrequest:changes_request_removed",
  "pipeline:span_created",
];

/** The user's comma-separated event list (empty = every key) → validated keys. */
export function chooseEvents(raw: unknown): string[] {
  const wanted = (typeof raw === "string" ? raw : "").split(",").map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (wanted.length === 0) return [...EVENT_KEYS];
  const bad = wanted.filter((e) => !EVENT_KEYS.includes(e));
  if (bad.length > 0) {
    throw new Error(
      `Unknown Bitbucket event key(s): ${bad.join(", ")}. Use ${EVENT_KEYS.join(", ")}.`,
    );
  }
  return [...new Set(wanted)];
}

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  advanced: true,
  hint: `Comma-separated Bitbucket event keys to fire on: ${
    EVENT_KEYS.join(", ")
  }. Leave empty for all of them.`,
};

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  /** The webhook `uuid` with its curly braces stripped (as `delete-repository-hook` takes it). */
  hookId: string;
  workspace: string;
  repoSlug: string;
  /** The Bitbucket event key this subscription is for (`repo:push`, …). */
  event: string;
  /** The per-subscription signing secret (plaintext jsonb: D5 amended). */
  secret: string;
}

/** The run's `trigger.event`. */
export interface BitbucketEvent {
  event: string;
  deliveryId: string | null;
  repository: string | null;
  actor: string | null;
  /** Bitbucket's webhook payload, verbatim. */
  payload: Record<string, unknown>;
}

const WORKSPACE_PARAM: Param = {
  key: "workspace",
  label: "Workspace",
  type: "string",
  required: true,
  hint: "The workspace slug (the first part of the repository URL).",
};

const REPO_PARAM: Param = {
  key: "repoSlug",
  label: "Repository",
  type: "string",
  required: true,
  hint: "The repository slug.",
};

const BASE_OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event key" },
  { key: "deliveryId", type: "string", label: "Delivery ID" },
  { key: "repository", type: "string", label: "Repository" },
  { key: "actor", type: "string", label: "Actor" },
  { key: "payload", type: "object", label: "Payload" },
];

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function required(v: string | undefined, label: string): string {
  const s = v?.trim();
  if (!s) throw new Error(`${label} is required to register a Bitbucket webhook.`);
  return s;
}

/** Bitbucket reports a webhook `uuid` as `{…}`; the path form this app uses has no braces. */
function bareUuid(v: unknown): string | null {
  const s = str(v);
  return s ? s.replace(/^\{|\}$/g, "") : null;
}

/** True for the "no such webhook" answers `BitbucketClient` raises (it throws plain Errors). */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^Bitbucket (404|410)\b/.test(err.message);
}

const hooksPath = (workspace: string, repoSlug: string) =>
  `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repoSlug)}/hooks`;

/** Ids of the repository's webhooks that already deliver to `url` (first 100 webhooks). */
async function hooksPointingAt(
  client: BitbucketClient,
  workspace: string,
  repoSlug: string,
  url: string,
): Promise<string[]> {
  const res = await client.request<BitbucketListResponse<{ uuid?: unknown; url?: unknown }>>(
    hooksPath(workspace, repoSlug),
    { query: { pagelen: 100 } },
  );
  const found: string[] = [];
  for (const h of Array.isArray(res?.values) ? res.values : []) {
    const id = bareUuid(h.uuid);
    if (id && h.url === url) found.push(id);
  }
  return found;
}

async function deleteHook(
  client: BitbucketClient,
  workspace: string,
  repoSlug: string,
  hookId: string,
): Promise<void> {
  try {
    await client.request(`${hooksPath(workspace, repoSlug)}/${encodeURIComponent(hookId)}`, {
      method: "DELETE",
    });
  } catch (err) {
    if (isGone(err)) return;
    throw err;
  }
}

/** Verify a delivery and return its parsed payload; throws, echoing nothing, on any shortfall. */
async function verifiedPayload(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
): Promise<Record<string, unknown>> {
  const rawBody = requireRawBody(raw);
  const key = requireSecret(secret);
  const given = header(raw, "x-hub-signature");
  const expected = `sha256=${await hmac("SHA-256", key, rawBody, "hex")}`;
  if (given === undefined || !timingSafeEqual(given, expected)) {
    throw new Error("Bitbucket delivery refused: the signature does not match.");
  }
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new Error("Bitbucket delivery refused: the body is not JSON.");
  }
  const obj = asObject(payload);
  if (!obj) throw new Error("Bitbucket delivery refused: the body is not a JSON object.");
  return obj;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The Bitbucket event key (`X-Event-Key`) this trigger fires on. Omit for the Any-event trigger. */
  event?: string;
  output: OutputField[];
  samplePayload: Record<string, unknown>;
}

/** Build one Bitbucket webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, BitbucketEvent, TriggerState> {
  const chosen = (params: TriggerParams | undefined) =>
    spec.event ? [spec.event] : chooseEvents(params?.events);
  const sample: BitbucketEvent = {
    event: spec.event ?? "repo:push",
    deliveryId: "1f0e2b9c-6c0e-4e1f-9a53-0f8c2f3d4e5a",
    repository: "teamsinspace/documentation-tests",
    actor: "Emma",
    payload: spec.samplePayload,
  };
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.event
      ? [WORKSPACE_PARAM, REPO_PARAM]
      : [WORKSPACE_PARAM, REPO_PARAM, EVENTS_PARAM],
    output: [...BASE_OUTPUT, ...spec.output],
    sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const workspace = required(params.workspace, "Workspace");
      const repoSlug = required(params.repoSlug, "Repository");
      const events = chosen(params); // validated before any request
      const client = new BitbucketClient(ctx);
      for (const id of await hooksPointingAt(client, workspace, repoSlug, callbackUrl)) {
        await deleteHook(client, workspace, repoSlug, id);
      }
      const secret = randomSecret();
      const created = await client.request<{ uuid?: unknown }>(hooksPath(workspace, repoSlug), {
        method: "POST",
        body: {
          description: "w6w trigger",
          url: callbackUrl,
          active: true,
          secret,
          events,
        },
      });
      const hookId = bareUuid(created?.uuid);
      if (!hookId) throw new Error("Bitbucket created the webhook but returned no uuid.");
      return { hookId, workspace, repoSlug, event: events.join(","), secret };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      const hookId = str(s?.hookId);
      if (hookId && s?.workspace && s?.repoSlug) {
        await deleteHook(new BitbucketClient(ctx), s.workspace, s.repoSlug, hookId);
      }
    },

    async handleIngest({ raw, params, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Bitbucket delivers webhooks with POST, not ${raw.method}.`);
      }
      const payload = await verifiedPayload(raw, state?.secret);
      const key = header(raw, "x-event-key");
      if (key === undefined || !chosen(params).includes(key)) return [];
      return [{
        event: key,
        deliveryId: header(raw, "x-request-uuid") ?? null,
        repository: str(asObject(payload.repository)?.full_name),
        actor: str(asObject(payload.actor)?.display_name),
        payload,
      }];
    },
  };
}
