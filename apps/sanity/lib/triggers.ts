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
import { API_VERSION, SanityClient } from "./client.ts";

/**
 * Sanity webhook triggers (rfcs/trigger.md, webhook form, API-registered).
 *
 *   - `onSubscribe` creates a GROQ-powered DOCUMENT webhook with
 *     `POST /hooks/projects/{projectId}` (`type: "document"`, `rule.on: [<operation>]`, the
 *     callback `url`, a `secret`). Sanity accepts a caller-chosen secret, so the host mints one
 *     with `randomSecret()` (D5 (1)) and keeps it, with the webhook `id`, in the subscription
 *     `state`. The token needs the `sanity.project.webhooks` create/delete grants.
 *   - `onUnsubscribe` deletes it with `DELETE /hooks/projects/{projectId}/{id}`; a webhook
 *     Sanity no longer has (404) counts as deleted.
 *   - `handleIngest` verifies `sanity-webhook-signature` (`t=<unix ms>,v1=<base64url HMAC-SHA256
 *     of "<t>.<raw body>">`, Stripe-style) BEFORE it parses the body, and rejects a timestamp
 *     more than five minutes from now.
 *
 * Trust model: the signature binds the timestamp and the whole body. The `sanity-*` headers
 * (operation, document id, transaction) are NOT covered by it; the event data comes from the
 * signed body, the headers only fill the descriptive fields.
 *
 * Docs (verified 2026-11-10): https://www.sanity.io/docs/webhooks,
 * https://www.sanity.io/docs/http-reference/webhooks and the vendor's own verifier,
 * https://github.com/sanity-io/webhook-toolkit/blob/main/src/signature.ts
 */

export interface TriggerParams {
  dataset?: string;
  filter?: string;
  includeDrafts?: boolean;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  projectId: string;
  /** The signing secret the host chose and registered. */
  secret: string;
}

/** The run's `trigger.event`: one Sanity document change. */
export interface SanityEvent {
  operation: string;
  documentId: string | null;
  documentType: string | null;
  projectId: string | null;
  dataset: string | null;
  transactionId: string | null;
  transactionTime: string | null;
  webhookId: string | null;
  idempotencyKey: string | null;
  document: Record<string, unknown>;
}

const PARAMS: Param[] = [
  {
    key: "dataset",
    label: "Dataset",
    type: "string",
    hint:
      "The dataset to watch. Leave empty for the connection's dataset, or * for every dataset in the project.",
  },
  {
    key: "filter",
    label: "GROQ filter",
    type: "string",
    advanced: true,
    hint:
      'A GROQ filter (what goes between *[ and ]), e.g. _type == "post". Empty = every document.',
  },
  {
    key: "includeDrafts",
    label: "Include drafts",
    type: "boolean",
    advanced: true,
    hint:
      "Also fire for drafts.* documents. Off by default: every keystroke in Studio is a draft update.",
  },
];

const OUTPUT: OutputField[] = [
  { key: "operation", type: "string", label: "Operation (create, update, delete)" },
  { key: "documentId", type: "string", label: "Document ID" },
  { key: "documentType", type: "string", label: "Document type (_type)" },
  { key: "projectId", type: "string", label: "Project ID" },
  { key: "dataset", type: "string", label: "Dataset" },
  { key: "transactionId", type: "string", label: "Transaction ID" },
  { key: "transactionTime", type: "string", label: "Transaction time" },
  { key: "webhookId", type: "string", label: "Webhook ID" },
  { key: "idempotencyKey", type: "string", label: "Idempotency key (de-duplicate on this)" },
  { key: "document", type: "object", label: "Document (the webhook projection)" },
];

function sampleFor(operation: string): SanityEvent {
  return {
    operation,
    documentId: "post-1",
    documentType: "post",
    projectId: "sample-project",
    dataset: "production",
    transactionId: "sample-transaction",
    transactionTime: "2026-11-10T10:30:00.000000Z",
    webhookId: "sample-webhook",
    idempotencyKey: "sample-idempotency-key",
    document: { _id: "post-1", _type: "post", title: "Hello" },
  };
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

/** True for the "no such webhook" answer `SanityClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^Sanity 404\b/.test(err.message);
}

/** Standard base64 → base64url without padding, the form Sanity signs in. */
function base64url(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const SIGNATURE_HEADER = /^t=(\d+)[, ]+v1=([^, ]+)$/;

/**
 * Verify the delivery's signature and clock, and return the RAW body it covers. Throws (never
 * echoing the secret, the signature or the body) unless it verifies; an unset secret is refused
 * before any compare.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
  nowMs: number = Date.now(),
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const received = header(raw, "sanity-webhook-signature");
  if (!received) {
    throw new Error("Sanity delivery refused: the sanity-webhook-signature header is missing.");
  }
  const m = SIGNATURE_HEADER.exec(received.trim());
  if (!m) throw new Error("Sanity delivery refused: the signature header is malformed.");
  const [, t, v1] = m;
  if (!withinTolerance(Number(t) / 1000, nowMs)) {
    throw new Error(
      "Sanity delivery refused: the signature timestamp is outside the allowed window.",
    );
  }
  const expected = base64url(await hmac("SHA-256", key, `${t}.${body}`, "base64"));
  if (!timingSafeEqual(expected, v1)) {
    throw new Error("Sanity delivery refused: the signature does not match.");
  }
  return body;
}

/** The verified delivery → its normalized event. */
export function normalizeDelivery(
  body: string,
  headers: Record<string, string>,
  fallbackOperation: string,
): SanityEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("Not a Sanity webhook delivery: the body is not JSON.");
  }
  const doc = asObject(parsed);
  if (!doc) throw new Error("Not a Sanity webhook delivery: expected a JSON object.");
  return {
    operation: str(header({ headers }, "sanity-operation")) ?? fallbackOperation,
    documentId: str(header({ headers }, "sanity-document-id")) ?? str(doc._id),
    documentType: str(doc._type),
    projectId: str(header({ headers }, "sanity-project-id")),
    dataset: str(header({ headers }, "sanity-dataset")),
    transactionId: str(header({ headers }, "sanity-transaction-id")),
    transactionTime: str(header({ headers }, "sanity-transaction-time")),
    webhookId: str(header({ headers }, "sanity-webhook-id")),
    idempotencyKey: str(header({ headers }, "idempotency-key")),
    document: doc,
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The Sanity document operation: `create`, `update` or `delete`. */
  operation: "create" | "update" | "delete";
}

/** Build one Sanity document-change webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, SanityEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: PARAMS,
    output: OUTPUT,
    sample: sampleFor(spec.operation),

    async onSubscribe({ params, subscriptionId, callbackUrl }, ctx: HookContext) {
      const client = new SanityClient(ctx);
      const dataset = params?.dataset?.trim() || client.datasetFor();
      const secret = randomSecret();
      const rule: Record<string, unknown> = { on: [spec.operation] };
      if (params?.filter?.trim()) rule.filter = params.filter.trim();
      const made = await client.request<{ id?: string }>(`/hooks/projects/${client.projectId}`, {
        method: "POST",
        live: true,
        body: {
          type: "document",
          name: `w6w-${subscriptionId}`,
          url: callbackUrl,
          dataset,
          rule,
          apiVersion: API_VERSION,
          httpMethod: "POST",
          includeDrafts: params?.includeDrafts === true,
          secret,
          isDisabledByUser: false,
        },
      });
      if (!made?.id) throw new Error("Sanity created the webhook but returned no id.");
      return { webhookId: made.id, projectId: client.projectId, secret };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.webhookId) return;
      const client = new SanityClient(ctx);
      try {
        await client.request(
          `/hooks/projects/${client.projectId}/${encodeURIComponent(s.webhookId)}`,
          { method: "DELETE", live: true },
        );
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Sanity delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, state?.secret);
      return [normalizeDelivery(body, raw.headers, spec.operation)];
    },
  };
}
