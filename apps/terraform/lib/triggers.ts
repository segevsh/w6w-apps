import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { TerraformClient } from "./client.ts";
import { WORKSPACE_PARAMS } from "./params.ts";
import { resolveWorkspace } from "./workspaces.ts";

/**
 * HCP Terraform / Terraform Enterprise run-notification triggers (rfcs/trigger.md, webhook form,
 * API-registered and signed).
 *
 *   - `onSubscribe` creates a workspace notification configuration, `destination-type: generic`,
 *     with the callback URL, the chosen `run:*` triggers and a fresh `token` from `randomSecret()`
 *     (the vendor accepts a caller-chosen token, D5 (1)); the configuration id and the token are
 *     kept in the subscription `state`.
 *   - `onUnsubscribe` deletes the configuration; one HCP Terraform no longer has (404) counts as
 *     deleted.
 *   - `handleIngest` verifies `X-TFE-Notification-Signature` BEFORE it parses anything: hex
 *     HMAC-SHA512 of the exact request body keyed with the token, compared in constant time. The kit
 *     `hmac` only offers SHA-256 and SHA-1, so the SHA-512 is computed here with the same
 *     web-standard `crypto.subtle` the kit uses.
 *
 * Trust model: the signature covers the whole body, so a body cannot be altered, but the scheme
 * carries no timestamp, so a captured signed delivery can be replayed. Nothing here can remember
 * deliveries (`handleIngest` cannot write state).
 *
 * Creating an enabled configuration makes HCP Terraform send a verification request to the callback
 * URL at once. The subscription has no token stored yet at that moment, so the trigger refuses it
 * (one failed delivery row); the host still answers it, which is all HCP Terraform needs.
 *
 * Docs (verified 2026-11-10):
 * https://developer.hashicorp.com/terraform/cloud-docs/api-docs/notification-configurations,
 * https://developer.hashicorp.com/terraform/cloud-docs/api-docs/notification-configurations/workspace
 */

export interface TriggerParams {
  workspaceId?: string;
  organization?: string;
  workspace?: string;
  triggers?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  workspaceId: string;
  notificationConfigurationId: string;
  /** The HMAC key HCP Terraform signs deliveries with. Never logged, never echoed. */
  token: string;
}

/** The run's `trigger.event`: one run notification. */
export interface TerraformRunEvent {
  trigger: string;
  message: string | null;
  runStatus: string | null;
  runId: string | null;
  runUrl: string | null;
  runMessage: string | null;
  runCreatedAt: string | null;
  runCreatedBy: string | null;
  runUpdatedAt: string | null;
  runUpdatedBy: string | null;
  workspaceId: string | null;
  workspaceName: string | null;
  organizationName: string | null;
  notificationConfigurationId: string | null;
}

/** Every run notification trigger the workspace notifications page lists. */
export const RUN_TRIGGERS = [
  "run:created",
  "run:planning",
  "run:needs_attention",
  "run:pending_apply_approval",
  "run:cost_estimated",
  "run:policy_override_required",
  "run:policies_checked",
  "run:applying",
  "run:completed",
  "run:errored",
  "run:run_errored",
  "run:run_canceled",
  "run:policy_soft_failed",
];

const TRIGGERS_PARAM: Param = {
  key: "triggers",
  label: "Run events",
  type: "string",
  advanced: true,
  hint: `Comma-separated run notification triggers to fire on: ${
    RUN_TRIGGERS.join(", ")
  }. Leave empty for all of them.`,
};

const OUTPUT: OutputField[] = [
  { key: "trigger", type: "string", label: "Trigger (e.g. run:completed)" },
  { key: "message", type: "string", label: "Message" },
  { key: "runStatus", type: "string", label: "Run status" },
  { key: "runId", type: "string", label: "Run ID" },
  { key: "runUrl", type: "string", label: "Run URL" },
  { key: "runMessage", type: "string", label: "Reason the run was queued" },
  { key: "runCreatedAt", type: "string", label: "Run created at" },
  { key: "runCreatedBy", type: "string", label: "Run created by" },
  { key: "runUpdatedAt", type: "string", label: "Run updated at" },
  { key: "runUpdatedBy", type: "string", label: "Run updated by" },
  { key: "workspaceId", type: "string", label: "Workspace ID" },
  { key: "workspaceName", type: "string", label: "Workspace name" },
  { key: "organizationName", type: "string", label: "Organization name" },
  { key: "notificationConfigurationId", type: "string", label: "Notification configuration ID" },
];

const SAMPLE: TerraformRunEvent = {
  trigger: "run:completed",
  message: "Run Completed",
  runStatus: "applied",
  runId: "run-FwnENkvDnrpyFC7M",
  runUrl: "https://app.terraform.io/app/acme-org/my-workspace/runs/run-FwnENkvDnrpyFC7M",
  runMessage: "Add five new queue workers",
  runCreatedAt: "2026-11-09T18:34:00.000Z",
  runCreatedBy: "sample-user",
  runUpdatedAt: "2026-11-09T18:37:04.000Z",
  runUpdatedBy: "sample-user",
  workspaceId: "ws-XdeUVMWShTesDMME",
  workspaceName: "my-workspace",
  organizationName: "acme-org",
  notificationConfigurationId: "nc-AeUQ2zfKZzW9TiGZ",
};

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

/** True for the "no such configuration" answer `TerraformClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^Terraform 404\b/.test(err.message);
}

/** The user's trigger list (default: `fallback`) → validated names. */
export function chooseTriggers(
  raw: string | undefined,
  fallback: string[] = RUN_TRIGGERS,
): string[] {
  const wanted = (raw ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (wanted.length === 0) return fallback;
  const bad = wanted.filter((e) => !RUN_TRIGGERS.includes(e));
  if (bad.length > 0) {
    throw new Error(
      `Unknown HCP Terraform run trigger(s): ${bad.join(", ")}. Use ${RUN_TRIGGERS.join(", ")}.`,
    );
  }
  return [...new Set(wanted)];
}

const encoder = new TextEncoder();

/** Lowercase hex HMAC-SHA512 of `data` under `key` (the kit's `hmac` stops at SHA-256). */
export async function hmacSha512Hex(key: string, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data)));
  let out = "";
  for (const b of sig) out += b.toString(16).padStart(2, "0");
  return out;
}

/**
 * Verify the delivery's signature over the exact body. Returns the body text. Throws (never echoing
 * the token, the signature or the body) unless it verifies; an unset token is refused before any
 * compare.
 */
export async function verifyDelivery(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  token: unknown,
): Promise<string> {
  const key = requireSecret(token);
  const body = requireRawBody(raw);
  const given = header(raw, "x-tfe-notification-signature");
  if (!given) {
    throw new Error("Terraform delivery refused: the notification signature header is missing.");
  }
  const expected = await hmacSha512Hex(key, body);
  if (!timingSafeEqual(expected, given.trim())) {
    throw new Error("Terraform delivery refused: the notification signature does not match.");
  }
  return body;
}

/** The verified body → one event per notification entry (HCP Terraform currently sends one). */
export function normalizeDelivery(body: string): TerraformRunEvent[] {
  let parsed: Record<string, unknown> | null;
  try {
    parsed = asObject(JSON.parse(body));
  } catch {
    parsed = null;
  }
  const notifications = parsed && Array.isArray(parsed.notifications) ? parsed.notifications : null;
  if (!parsed || !notifications) {
    throw new Error("Not an HCP Terraform run notification: expected a notifications list.");
  }
  const events: TerraformRunEvent[] = [];
  for (const n of notifications) {
    const note = asObject(n);
    const trigger = str(note?.trigger_type) ?? str(note?.trigger);
    if (!note || !trigger) continue;
    events.push({
      trigger,
      message: str(note.message),
      runStatus: str(note.run_status),
      runId: str(parsed.run_id),
      runUrl: str(parsed.run_url),
      runMessage: str(parsed.run_message),
      runCreatedAt: str(parsed.run_created_at),
      runCreatedBy: str(parsed.run_created_by),
      runUpdatedAt: str(note.run_updated_at),
      runUpdatedBy: str(note.run_updated_by),
      workspaceId: str(parsed.workspace_id),
      workspaceName: str(parsed.workspace_name),
      organizationName: str(parsed.organization_name),
      notificationConfigurationId: str(parsed.notification_configuration_id),
    });
  }
  return events;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The run triggers this trigger fires on. Absent: the user picks with the `triggers` param. */
  triggers?: string[];
  /** Fields of the sample that differ from the default completed-run one. */
  sample?: Partial<TerraformRunEvent>;
}

/** Build one HCP Terraform run-notification webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, TerraformRunEvent, TriggerState> {
  const wanted = (params?: TriggerParams) => spec.triggers ?? chooseTriggers(params?.triggers);
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.triggers ? [...WORKSPACE_PARAMS] : [...WORKSPACE_PARAMS, TRIGGERS_PARAM],
    output: OUTPUT,
    sample: { ...SAMPLE, ...(spec.triggers ? { trigger: spec.triggers[0] } : {}), ...spec.sample },

    async onSubscribe({ params, subscriptionId, callbackUrl }, ctx: HookContext) {
      const triggers = wanted(params);
      const workspace = await resolveWorkspace(params as Record<string, unknown>, ctx);
      const token = randomSecret();
      const made = await new TerraformClient(ctx).request(
        `/api/v2/workspaces/${encodeURIComponent(workspace.id)}/notification-configurations`,
        {
          method: "POST",
          body: {
            data: {
              type: "notification-configuration",
              attributes: {
                "destination-type": "generic",
                enabled: true,
                name: `w6w ${subscriptionId}`,
                url: callbackUrl,
                token,
                triggers,
              },
            },
          },
        },
      );
      const id = str(asObject(made.data)?.id);
      if (!id) {
        throw new Error("HCP Terraform did not return an id for the notification configuration.");
      }
      return { workspaceId: workspace.id, notificationConfigurationId: id, token };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const id = str((state as Partial<TriggerState> | undefined)?.notificationConfigurationId);
      if (!id) return;
      try {
        await new TerraformClient(ctx).request(
          `/api/v2/notification-configurations/${encodeURIComponent(id)}`,
          { method: "DELETE" },
        );
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, params, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`HCP Terraform delivers notifications with POST, not ${raw.method}.`);
      }
      const body = await verifyDelivery(raw, (state as Partial<TriggerState> | undefined)?.token);
      const want = wanted(params);
      return normalizeDelivery(body).filter((e) => want.includes(e.trigger));
    },
  };
}

/**
 * Notification triggers that are not run events (HCP Terraform "Workspace notifications", read
 * 2026-11-10): health assessments / drift detection and auto-destroy / deletion. Their generic
 * payload is `payload_version: 2` with `trigger_scope`, `trigger`, `message` and `details`.
 */
export const WORKSPACE_TRIGGERS = [
  "assessment:drifted",
  "assessment:check_failure",
  "assessment:failed",
  "workspace:auto_destroy_reminder",
  "workspace:auto_destroy_run_results",
  "workspace:deleted",
];

/** The event a workspace-scope (non-run) notification becomes. */
export interface TerraformWorkspaceEvent {
  trigger: string;
  triggerScope: string | null;
  message: string | null;
  workspaceName: string | null;
  organizationName: string | null;
  notificationConfigurationId: string | null;
  details: Record<string, unknown> | null;
}

/** The verified body → the workspace-scope event (one per payload). */
export function normalizeWorkspaceDelivery(body: string): TerraformWorkspaceEvent[] {
  let parsed: Record<string, unknown> | null;
  try {
    parsed = asObject(JSON.parse(body));
  } catch {
    parsed = null;
  }
  const trigger = str(parsed?.trigger);
  if (!parsed || !trigger) {
    throw new Error("Not an HCP Terraform workspace notification: expected a trigger.");
  }
  const details = asObject(parsed.details);
  return [{
    trigger,
    triggerScope: str(parsed.trigger_scope),
    message: str(parsed.message),
    workspaceName: str(details?.workspace_name) ?? str(parsed.workspace_name),
    organizationName: str(details?.organization_name) ?? str(parsed.organization_name),
    notificationConfigurationId: str(parsed.notification_configuration_id),
    details,
  }];
}

function chooseFrom(raw: string | undefined, catalog: string[]): string[] {
  const wanted = (raw ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (wanted.length === 0) return catalog;
  const bad = wanted.filter((e) => !catalog.includes(e));
  if (bad.length > 0) {
    throw new Error(
      `Unknown HCP Terraform notification trigger(s): ${bad.join(", ")}. Use ${
        catalog.join(", ")
      }.`,
    );
  }
  return [...new Set(wanted)];
}

export interface EventTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The notification triggers the user may choose from (empty selection = all of them). */
  catalog: string[];
  /** Fixed trigger list: no `triggers` param. */
  fixed?: string[];
  /** Normalise a verified body: run payloads, workspace payloads, or whichever arrives. */
  kind: "run" | "workspace" | "any";
  output: OutputField[];
  sample: Record<string, unknown>;
}

/**
 * A notification trigger that is not one of the original run triggers: workspace-scope events and
 * the all-events trigger. It reuses `webhookTrigger`'s API registration (generic destination, fresh
 * `randomSecret()` token) and `verifyDelivery`'s SHA-512 HMAC check, and picks the payload shape by
 * `trigger_scope`.
 */
export function eventTrigger(
  spec: EventTriggerSpec,
): TriggerDefinition<TriggerParams, Record<string, unknown>, TriggerState> {
  const wanted = (params?: TriggerParams) =>
    spec.fixed ?? chooseFrom(params?.triggers, spec.catalog);
  const hint = `Comma-separated notification triggers: ${
    spec.catalog.join(", ")
  }. Leave empty for all of them.`;
  const registration = (params?: TriggerParams) =>
    webhookTrigger({
      key: spec.key,
      title: spec.title,
      description: spec.description,
      triggers: wanted(params),
    });
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.fixed ? [...WORKSPACE_PARAMS] : [...WORKSPACE_PARAMS, { ...TRIGGERS_PARAM, hint }],
    output: spec.output,
    sample: spec.sample,

    onSubscribe(args, ctx: HookContext) {
      // Validate before any request, then register exactly the chosen triggers.
      return registration(args.params).onSubscribe!(args, ctx);
    },

    onUnsubscribe(args, ctx: HookContext) {
      return registration().onUnsubscribe!(args, ctx);
    },

    async handleIngest({ raw, params, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`HCP Terraform delivers notifications with POST, not ${raw.method}.`);
      }
      const body = await verifyDelivery(raw, (state as Partial<TriggerState> | undefined)?.token);
      const want = wanted(params);
      let scoped = spec.kind === "workspace";
      if (spec.kind === "any") {
        let parsed: Record<string, unknown> | null = null;
        try {
          parsed = asObject(JSON.parse(body));
        } catch { /* normalised below */ }
        scoped = parsed !== null && !Array.isArray(parsed.notifications) &&
          str(parsed.trigger) !== null;
      }
      const events: Array<Record<string, unknown> & { trigger: string }> = scoped
        ? normalizeWorkspaceDelivery(body) as never
        : normalizeDelivery(body) as never;
      return events.filter((e) => want.includes(e.trigger));
    },
  };
}
