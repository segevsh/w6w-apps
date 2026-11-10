import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";
import { GitLabClient, projectPath } from "./client.ts";

/**
 * GitLab project-webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` first probes `GET /version` through the app's client. GitLab 19.0 or later (or a
 *     probe that fails / cannot be parsed) is SIGNED mode: a project webhook pointed at the host's
 *     `callbackUrl` with a per-subscription SIGNING token (D5 (1)), `whsec_` + base64 of 32 random
 *     bytes, sent as `signing_token` and nothing else (no `token`, so GitLab never sends
 *     `X-Gitlab-Token`). A server that reports a version before 19.0 ignores `signing_token`, so it is
 *     TOKEN mode: a NEW random `token`, distinct from any signing key, and no `signing_token`. It
 *     first deletes any webhook already pointed there.
 *   - `onUnsubscribe` deletes that webhook; one GitLab no longer has counts as deleted.
 *   - `handleIngest` is gated by the subscription's `mode`. Signed (or `mode` absent, a subscription
 *     made before the probe existed): the Standard Webhooks signature is verified BEFORE parsing:
 *     `webhook-signature` is a space-separated list of `v1,<base64 HMAC-SHA256>` over
 *     `<webhook-id>.<webhook-timestamp>.<raw body>` keyed with the decoded token, `webhook-timestamp`
 *     must be within 5 minutes, and `X-Gitlab-Token` is never consulted. Token mode: only
 *     `X-Gitlab-Token`, compared in constant time with the stored `legacyToken` (a shared password
 *     in a header, not bound to the body; such servers send no signature).
 *
 * Docs (verified 2026-11-09): https://docs.gitlab.com/user/project/integrations/webhooks/
 * (signing token, "Verify the signature") and https://docs.gitlab.com/api/project_webhooks/
 * (`signing_token`, `token`, `*_events` flags).
 */

export interface TriggerParams {
  /** Numeric project id or `group/project` path. */
  projectId?: string;
  /** Comma-separated actions to keep (`open,close`); blank keeps every action. */
  actions?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  hookId: string;
  projectId: string;
  /** GitLab `object_kind` this subscription is for. */
  kind: string;
  /** `signed` (GitLab 19.0+, the default when absent) or `token` (server reported before 19.0). */
  mode?: "signed" | "token";
  /** Signed mode: the per-subscription signing token, `whsec_<base64>` (plaintext jsonb: D5 amended). */
  signingToken?: string;
  /** Token mode: the `X-Gitlab-Token` secret, a random value distinct from any signing key. */
  legacyToken?: string;
}

/** The run's `trigger.event`. */
export interface GitLabEvent {
  kind: string;
  action: string | null;
  deliveryId: string | null;
  project: string | null;
  user: string | null;
  /** GitLab's webhook payload, verbatim. */
  payload: Record<string, unknown>;
}

const PROJECT_PARAM: Param = {
  key: "projectId",
  label: "Project",
  type: "string",
  required: true,
  hint: "The numeric project id or the full path, e.g. `my-group/my-project`.",
};

const ACTIONS_PARAM: Param = {
  key: "actions",
  label: "Only these actions",
  type: "string",
  hint: "Comma-separated actions to react to, e.g. `open,close`. Blank for every action.",
};

const BASE_OUTPUT: OutputField[] = [
  { key: "kind", type: "string", label: "Event kind" },
  { key: "action", type: "string", label: "Action" },
  { key: "deliveryId", type: "string", label: "Delivery ID" },
  { key: "project", type: "string", label: "Project" },
  { key: "user", type: "string", label: "User" },
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
  if (!s) throw new Error(`${label} is required to register a GitLab webhook.`);
  return s;
}

/** True for the "no such webhook" answers `GitLabClient` raises (it throws plain Errors). */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^GitLab (404|410)\b/.test(err.message);
}

function bytesFromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** A fresh signing token in GitLab's required `whsec_<base64 of 32 bytes>` form. */
export function newSigningToken(): string {
  let bin = "";
  for (const b of bytesFromHex(randomSecret(32))) bin += String.fromCharCode(b);
  return `whsec_${btoa(bin)}`;
}

/** The HMAC key behind a `whsec_<base64>` token; throws, echoing nothing, if it is not one. */
function keyOf(token: string): Uint8Array {
  const b64 = token.startsWith("whsec_") ? token.slice("whsec_".length) : "";
  try {
    const bin = atob(b64);
    if (bin.length === 0) throw new Error("empty");
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    throw new Error("GitLab delivery refused: the stored signing token is unusable.");
  }
}

async function hooksPointingAt(
  client: GitLabClient,
  projectId: string,
  url: string,
): Promise<string[]> {
  const hooks = await client.request<Array<{ id?: unknown; url?: unknown }>>(
    `/projects/${projectPath(projectId)}/hooks`,
    { query: { per_page: 100 } },
  );
  const found: string[] = [];
  for (const h of Array.isArray(hooks) ? hooks : []) {
    const id = str(h.id);
    if (id && h.url === url) found.push(id);
  }
  return found;
}

async function deleteHook(client: GitLabClient, projectId: string, hookId: string): Promise<void> {
  try {
    await client.request(
      `/projects/${projectPath(projectId)}/hooks/${encodeURIComponent(hookId)}`,
      {
        method: "DELETE",
      },
    );
  } catch (err) {
    if (isGone(err)) return;
    throw err;
  }
}

/** Token mode: the legacy shared secret in `X-Gitlab-Token`, constant time; throws, echoing nothing. */
function tokenPayload(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  legacyToken: unknown,
): Record<string, unknown> {
  const rawBody = requireRawBody(raw);
  const secret = requireSecret(legacyToken);
  const given = header(raw, "x-gitlab-token");
  if (!given || !timingSafeEqual(given, secret)) {
    throw new Error("GitLab delivery refused: it carries no valid token.");
  }
  return parseObject(rawBody);
}

/** Signed mode: verify a delivery's signature and return its payload; throws, echoing nothing. */
async function verifiedPayload(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  signingToken: unknown,
  nowMs: number,
): Promise<Record<string, unknown>> {
  const rawBody = requireRawBody(raw);
  const token = requireSecret(signingToken);
  const id = header(raw, "webhook-id");
  const ts = header(raw, "webhook-timestamp");
  const signatures = header(raw, "webhook-signature");
  const key = keyOf(token);
  if (!id || !ts || !signatures) {
    throw new Error("GitLab delivery refused: it carries no signature.");
  }
  if (!/^\d{1,12}$/.test(ts) || !withinTolerance(Number(ts), nowMs)) {
    throw new Error(
      "GitLab delivery refused: the timestamp is missing or outside the 5-minute window.",
    );
  }
  const expected = `v1,${await hmac("SHA-256", key, `${id}.${ts}.${rawBody}`, "base64")}`;
  let ok = false;
  for (const given of signatures.split(" ")) ok = timingSafeEqual(given, expected) || ok;
  if (!ok) throw new Error("GitLab delivery refused: the signature does not match.");
  return parseObject(rawBody);
}

/** True when `GET /version` reports a major before 19; a failed or unparseable probe is false. */
async function isPre19(client: GitLabClient): Promise<boolean> {
  try {
    const v = await client.request<{ version?: unknown }>("/version");
    const m = /^\s*(\d+)\.(\d+)/.exec(typeof v?.version === "string" ? v.version : "");
    return m !== null && Number(m[1]) < 19;
  } catch {
    return false;
  }
}

function parseObject(rawBody: string): Record<string, unknown> {
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new Error("GitLab delivery refused: the body is not JSON.");
  }
  const obj = asObject(payload);
  if (!obj) throw new Error("GitLab delivery refused: the body is not a JSON object.");
  return obj;
}

/** `action` from the top level (releases) or `object_attributes` (issues, merge requests). */
function actionOf(payload: Record<string, unknown>): string | null {
  return str(payload.action) ?? str(asObject(payload.object_attributes)?.action);
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** GitLab's `object_kind` for the delivery. */
  kind: string;
  /** The project-hook flag that turns this event on (`push_events`, …). */
  flag: string;
  output: OutputField[];
  samplePayload: Record<string, unknown>;
  hasActions: boolean;
}

/** Build one GitLab webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, GitLabEvent, TriggerState> {
  const sample: GitLabEvent = {
    kind: spec.kind,
    action: spec.hasActions ? actionOf(spec.samplePayload) : null,
    deliveryId: "3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
    project: "gitlab-org/gitlab-test",
    user: "jsmith",
    payload: spec.samplePayload,
  };
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.hasActions ? [PROJECT_PARAM, ACTIONS_PARAM] : [PROJECT_PARAM],
    output: [...BASE_OUTPUT, ...spec.output],
    sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const projectId = required(params.projectId, "Project");
      const client = new GitLabClient(ctx);
      const tokenMode = await isPre19(client);
      for (const id of await hooksPointingAt(client, projectId, callbackUrl)) {
        await deleteHook(client, projectId, id);
      }
      const secret = tokenMode ? randomSecret(32) : newSigningToken();
      const created = await client.request<{ id?: unknown }>(
        `/projects/${projectPath(projectId)}/hooks`,
        {
          method: "POST",
          body: {
            url: callbackUrl,
            ...(tokenMode ? { token: secret } : { signing_token: secret }),
            enable_ssl_verification: true,
            push_events: false,
            [spec.flag]: true,
          },
        },
      );
      const hookId = str(created?.id);
      if (!hookId) throw new Error("GitLab created the webhook but returned no id.");
      return tokenMode
        ? { hookId, projectId, kind: spec.kind, mode: "token", legacyToken: secret }
        : { hookId, projectId, kind: spec.kind, mode: "signed", signingToken: secret };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      const hookId = str(s?.hookId);
      if (hookId && s?.projectId) await deleteHook(new GitLabClient(ctx), s.projectId, hookId);
    },

    async handleIngest({ raw, params, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`GitLab delivers webhooks with POST, not ${raw.method}.`);
      }
      const payload = state?.mode === "token"
        ? tokenPayload(raw, state.legacyToken)
        : await verifiedPayload(raw, state?.signingToken, Date.now());
      if (str(payload.object_kind) !== spec.kind) return [];
      const action = actionOf(payload);
      if (spec.hasActions) {
        const wanted = (params?.actions ?? "").split(",").map((a) => a.trim()).filter(Boolean);
        if (wanted.length > 0 && (action === null || !wanted.includes(action))) return [];
      }
      return [{
        kind: spec.kind,
        action,
        deliveryId: header(raw, "webhook-id") ?? null,
        project: str(asObject(payload.project)?.path_with_namespace),
        user: str(asObject(payload.user)?.username) ?? str(payload.user_username),
        payload,
      }];
    },
  };
}
