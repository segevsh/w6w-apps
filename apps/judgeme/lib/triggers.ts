import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { JudgeMeClient } from "./client.ts";

/**
 * Judge.me webhook triggers (rfcs/trigger.md, webhook form, API-registered).
 *
 *   - `onSubscribe` registers the callback URL for the trigger's event key with
 *     `POST /webhooks` (`{ webhook: { key, url } }`); `onUnsubscribe` removes exactly that
 *     key + URL pair with `DELETE /webhooks` (`{ key, url }`), so other webhooks are untouched. A
 *     404 on delete counts as already gone.
 *   - `handleIngest` verifies the `JUDGEME-HMAC-SHA256` header (hex HMAC-SHA256 of the exact
 *     request body) BEFORE it parses anything. Judge.me's guide says the signing secret depends on
 *     how the webhook was created: for a webhook created through the API with the shop's Private
 *     API token, that same token is the secret (D5 (2): the user pastes it as `signingSecret`; an
 *     OAuth app's secret key would be used for a webhook created through such an app, which this
 *     trigger does not do). The scheme has no timestamp, so there is no freshness window.
 *   - Judge.me's reference does not document the delivery body ("JSON or XML ... can vary by
 *     event"), so the parsed body is passed through whole as `payload`; only `reviewId` is
 *     extracted, and only when the body carries an `id` (flat or under `review`).
 *
 * Docs (verified 2026-11-10): https://judge.me/api/docs.yaml (webhook keys and /webhooks paths) and
 * https://help.judge.me/en/articles/8299679-verifying-webhooks-from-judge-me (signature)
 */

export interface TriggerParams {
  signingSecret?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  key: string;
  url: string;
}

/** The run's `trigger.event`: one Judge.me webhook delivery. */
export interface JudgeMeEvent {
  key: string;
  reviewId: string | null;
  payload: Record<string, unknown>;
}

const SIGNING_SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "Private API Token",
  type: "secret",
  required: true,
  hint:
    "Judge.me signs webhooks created through the API with the shop's Private API token, so paste the same Private API token this connection uses (Judge.me admin, Settings, Integrations, API token). A delivery that does not verify is refused.",
};

export const OUTPUT: OutputField[] = [
  { key: "key", type: "string", label: "Webhook key (review/created, review/updated)" },
  { key: "reviewId", type: "string", label: "Review ID (when the payload carries one)" },
  { key: "payload", type: "object", label: "Full webhook payload" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** True for the "no such webhook" answer `JudgeMeClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^Judge\.me 404\b/.test(err.message);
}

/**
 * Check `JUDGEME-HMAC-SHA256` against the exact bytes received. Judge.me notes that a web server may
 * rewrite the name to `X-Judgeme-Hmac-SHA256`, so both are read. Throws (never echoing the secret,
 * the signature or the header) unless it matches; an unset secret is refused before any compare.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const given = header(raw, "judgeme-hmac-sha256") ?? header(raw, "x-judgeme-hmac-sha256");
  if (given === undefined || given === "") {
    throw new Error("Judge.me delivery refused: the JUDGEME-HMAC-SHA256 header is missing.");
  }
  const expected = await hmac("SHA-256", key, body, "hex");
  if (!timingSafeEqual(expected, given.trim().toLowerCase())) {
    throw new Error("Judge.me delivery refused: the signature does not match.");
  }
  return body;
}

/** The verified body → the run's event. */
export function normalizeDelivery(key: string, body: unknown): JudgeMeEvent {
  const payload = asObject(body);
  if (!payload) throw new Error("Not a Judge.me webhook delivery: expected a JSON object.");
  const review = asObject(payload.review);
  return { key, reviewId: str(review?.id) ?? str(payload.id), payload };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The Judge.me `webhook_key` this trigger registers for. */
  webhookKey: string;
  sample: JudgeMeEvent;
}

/** Build one Judge.me review webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, JudgeMeEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [SIGNING_SECRET_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    async onSubscribe({ callbackUrl }, ctx: HookContext) {
      await new JudgeMeClient(ctx).json("/webhooks", {
        method: "POST",
        body: { webhook: { key: spec.webhookKey, url: callbackUrl } },
      });
      return { key: spec.webhookKey, url: callbackUrl };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.key || !s.url) return;
      try {
        await new JudgeMeClient(ctx).status("/webhooks", {
          method: "DELETE",
          body: { key: s.key, url: s.url },
        });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Judge.me delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, params?.signingSecret);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Judge.me delivery refused: the body is not JSON.");
      }
      return [normalizeDelivery(spec.webhookKey, parsed)];
    },
  };
}
