import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { CloudConvertClient } from "./client.ts";

/**
 * CloudConvert webhook triggers (rfcs/trigger.md, webhook form, API-registered).
 *
 *   - `onSubscribe` registers the callback URL as an account-wide webhook for one job event with
 *     `POST /v2/webhooks` (`{ url, events }`) and keeps the webhook id and the `signing_secret`
 *     the response carries in the subscription's state (D5: the vendor generates the secret).
 *   - `onUnsubscribe` deletes it with `DELETE /v2/webhooks/{id}`; a webhook CloudConvert no longer
 *     has (404 or 410) counts as deleted.
 *   - `handleIngest` verifies `CloudConvert-Signature` (hex HMAC-SHA256 of the full request body
 *     under the webhook's signing secret) BEFORE it parses anything, then emits one event.
 *
 * Trust model: the signature covers the exact body but carries no timestamp, so a captured
 * delivery can be replayed. The webhook is account-wide: it reports every job on the account,
 * including jobs started elsewhere, not only jobs this workflow created.
 *
 * Docs (verified 2026-11-10): https://cloudconvert.com/docs/api-reference/webhooks
 */

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  signingSecret: string;
}

/** The run's `trigger.event`: one CloudConvert job notification. */
export interface CloudConvertEvent {
  event: string;
  jobId: string | null;
  tag: string | null;
  status: string | null;
  createdAt: string | null;
  endedAt: string | null;
  tasks: unknown[];
  /** The whole job object, exactly as CloudConvert sent it. */
  job: Record<string, unknown>;
}

const OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event" },
  { key: "jobId", type: "string", label: "Job ID" },
  { key: "tag", type: "string", label: "Job Tag" },
  { key: "status", type: "string", label: "Job Status" },
  { key: "createdAt", type: "string", label: "Created At" },
  { key: "endedAt", type: "string", label: "Ended At" },
  { key: "tasks", type: "array", label: "Tasks (with export file URLs)" },
  { key: "job", type: "object", label: "Full Job" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** True for the "no such webhook" answers `CloudConvertClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^CloudConvert (404|410)\b/.test(err.message);
}

/** The delivery body → its event. Throws on a body that is not a CloudConvert job notification. */
export function normalizeDelivery(body: unknown): CloudConvertEvent {
  const d = asObject(body);
  const event = str(d?.event);
  const job = asObject(d?.job);
  if (!d || !event || !job) {
    throw new Error("Not a CloudConvert webhook delivery: expected `event` and `job`.");
  }
  return {
    event,
    jobId: str(job.id),
    tag: str(job.tag),
    status: str(job.status),
    createdAt: str(job.created_at),
    endedAt: str(job.ended_at),
    tasks: Array.isArray(job.tasks) ? job.tasks : [],
    job,
  };
}

/**
 * Check `CloudConvert-Signature` against the exact bytes received. Returns the raw body. Throws
 * (never echoing the secret, the signature or the header) unless it matches; an unset secret is
 * refused before any compare.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const given = header(raw, "cloudconvert-signature");
  if (given === undefined || given === "") {
    throw new Error("CloudConvert delivery refused: the CloudConvert-Signature header is missing.");
  }
  const expected = await hmac("SHA-256", key, body, "hex");
  if (!timingSafeEqual(expected, given.toLowerCase())) {
    throw new Error("CloudConvert delivery refused: the signature does not match.");
  }
  return body;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The CloudConvert webhook event: `job.created`, `job.finished` or `job.failed`. */
  event: "job.created" | "job.finished" | "job.failed";
  sample: CloudConvertEvent;
}

/** Build one CloudConvert job-event webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<Record<string, never>, CloudConvertEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [],
    output: OUTPUT,
    sample: spec.sample,

    async onSubscribe({ callbackUrl }, ctx: HookContext) {
      const created = await new CloudConvertClient(ctx).data<
        { id?: number | string; signing_secret?: string }
      >("/webhooks", { method: "POST", body: { url: callbackUrl, events: [spec.event] } });
      const webhookId = str(created?.id);
      const signingSecret = str(created?.signing_secret);
      if (!webhookId || !signingSecret) {
        // The webhook exists but cannot be verified or removed later: take it down again.
        if (webhookId) {
          try {
            await new CloudConvertClient(ctx).status(
              `/webhooks/${encodeURIComponent(webhookId)}`,
              { method: "DELETE" },
            );
          } catch { /* best-effort rollback */ }
        }
        throw new Error("CloudConvert created the webhook but returned no id or signing secret.");
      }
      return { webhookId, signingSecret };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.webhookId) return;
      try {
        await new CloudConvertClient(ctx).status(
          `/webhooks/${encodeURIComponent(s.webhookId)}`,
          { method: "DELETE" },
        );
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`CloudConvert delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, state?.signingSecret);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("CloudConvert delivery refused: the body is not JSON.");
      }
      const event = normalizeDelivery(parsed);
      // The webhook is registered for one event; anything else is acknowledged without a run.
      if (event.event !== spec.event) return [];
      return [event];
    },
  };
}
