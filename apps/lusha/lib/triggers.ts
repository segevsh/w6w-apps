import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";
import { LushaClient, strList } from "./client.ts";

/**
 * Lusha signal webhook trigger (rfcs/trigger.md, webhook form, API-registered, signed).
 *
 *   - `onSubscribe` registers the callback URL with `POST /api/subscriptions`: one subscription per
 *     contact or company id (up to 25 per request), all pointing at the callback URL. The ids of
 *     the subscriptions Lusha created are kept in the subscription `state`.
 *   - `onUnsubscribe` removes them with `POST /api/subscriptions/delete`; a subscription Lusha
 *     reports `NOT_FOUND` counts as deleted.
 *   - `handleIngest` verifies `X-Lusha-Signature`: the hex HMAC-SHA256 of
 *     `X-Lusha-Timestamp + "." + body` under the ACCOUNT webhook secret (D5 (2): the user pastes
 *     it as `signingSecret`), within five minutes of now, BEFORE it parses the body. Lusha
 *     documents the signed text as `JSON.stringify(payload)`; the host verifies the exact received
 *     text, which is what Lusha serialised.
 *
 * Lusha requires every delivery to be acknowledged with `{ received: true, timestamp, webhookId }`;
 * the handler returns that as the ingest `response` (rfcs/trigger.md, D8 seam).
 *
 * Docs (verified 2026-11-10): https://docs.lusha.com/v2/webhooks/overview.md,
 * https://docs.lusha.com/v2/webhooks/manage-subscriptions.md and
 * https://docs.lusha.com/v2/webhooks/security.md
 */

export interface TriggerParams {
  entityType: string;
  entityIds: string;
  signalTypes?: string;
  signingSecret?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  /** The ids of the Lusha subscriptions this trigger created. */
  subscriptionIds: string[];
}

/** The run's `trigger.event`: one Lusha signal. */
export interface LushaSignal {
  id: string | null;
  type: string | null;
  entityType: string | null;
  entityId: string | null;
  subscriptionId: string | null;
  timestamp: string | null;
  creditsCharged: number | null;
  data: Record<string, unknown>;
}

const MAX_ENTITIES = 25;

const ENTITY_TYPE_PARAM: Param = {
  key: "entityType",
  label: "Entity type",
  type: "select",
  required: true,
  options: [{ value: "contact", label: "contact" }, { value: "company", label: "company" }],
  hint: "Whether the ids below are Lusha contact ids or company ids.",
};

const ENTITY_IDS_PARAM: Param = {
  key: "entityIds",
  label: "Entity IDs",
  type: "string",
  required: true,
  hint:
    `Comma-separated Lusha contact or company ids to watch, up to ${MAX_ENTITIES}. Lusha pushes a signal for each id.`,
};

const SIGNAL_TYPES_PARAM: Param = {
  key: "signalTypes",
  label: "Signal types",
  type: "string",
  advanced: true,
  hint:
    "Comma-separated signal types to receive (the Signal Type List actions list them). Leave empty for all signals.",
};

const SIGNING_SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "Account webhook secret",
  type: "secret",
  required: true,
  hint:
    "Your Lusha account webhook secret (POST /api/account/secret/regenerate creates it; Lusha shows it once). Lusha signs every delivery with it; a delivery that does not verify is refused.",
};

const OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Delivery ID" },
  { key: "type", type: "string", label: "Signal type (e.g. promotion)" },
  { key: "entityType", type: "string", label: "Entity type (contact or company)" },
  { key: "entityId", type: "string", label: "Entity ID" },
  { key: "subscriptionId", type: "string", label: "Subscription ID" },
  { key: "timestamp", type: "string", label: "Signal time (ISO 8601)" },
  { key: "creditsCharged", type: "number", label: "Credits charged" },
  { key: "data", type: "object", label: "Signal data" },
];

const SAMPLE: LushaSignal = {
  id: "f3b87e05-0402-4f3e-8e26-6a38fd0ad62c",
  type: "promotion",
  entityType: "contact",
  entityId: "4158887495",
  subscriptionId: "507f1f77bcf86cd799439011",
  timestamp: "2026-01-14T16:16:35.841Z",
  creditsCharged: 1,
  data: {
    personId: 4158887495,
    currentCompanyName: "OMG Hospitality Group LLC",
    currentTitle: "Bartender",
    previousCompanyName: "First Watch Restaurants",
    signalDate: "2025-07-01",
  },
};

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** `X-Lusha-Timestamp` is a Unix time; accept seconds or milliseconds. */
function toSeconds(v: string): number | null {
  if (!/^\d{9,14}$/.test(v)) return null;
  const n = Number(v);
  return n > 1e11 ? Math.floor(n / 1000) : n;
}

/**
 * Verify the delivery's signature headers against the account secret and the clock. Returns the
 * parsed body. Throws (never echoing the secret, the signature or the body) unless it verifies; an
 * unset secret is refused before any compare.
 */
export async function verifyDelivery(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  signingSecret: unknown,
  nowMs: number = Date.now(),
): Promise<Record<string, unknown>> {
  const secret = requireSecret(signingSecret);
  const body = requireRawBody(raw);
  const signature = header(raw, "x-lusha-signature");
  const timestamp = header(raw, "x-lusha-timestamp");
  if (!signature || !timestamp) {
    throw new Error("Lusha delivery refused: the signature or timestamp header is missing.");
  }
  const ts = toSeconds(timestamp.trim());
  if (ts === null || !withinTolerance(ts, nowMs)) {
    throw new Error("Lusha delivery refused: the timestamp is outside the allowed window.");
  }
  const expected = await hmac("SHA-256", secret, `${timestamp}.${body}`, "hex");
  if (!timingSafeEqual(expected, signature.trim().toLowerCase())) {
    throw new Error("Lusha delivery refused: the signature does not match.");
  }
  let parsed: Record<string, unknown> | null;
  try {
    parsed = asObject(JSON.parse(body));
  } catch {
    parsed = null;
  }
  if (!parsed) throw new Error("Not a Lusha webhook delivery: expected a JSON object.");
  return parsed;
}

/** The verified delivery → its signal. */
export function normalizeDelivery(parsed: Record<string, unknown>): LushaSignal {
  const type = str(parsed.type);
  if (!type) throw new Error("Not a Lusha signal delivery: expected a signal type.");
  const credits = Number(asObject(parsed.billing)?.creditsCharged);
  return {
    id: str(parsed.id),
    type,
    entityType: str(parsed.entityType),
    entityId: str(parsed.entityId),
    subscriptionId: str(parsed.subscriptionId),
    timestamp: str(parsed.timestamp),
    creditsCharged: Number.isFinite(credits) ? credits : null,
    data: asObject(parsed.data) ?? {},
  };
}

/** The acknowledgement Lusha requires for every delivery (`received` must be true). */
export function ackResponse(webhookId: string | null, now: Date = new Date()) {
  return {
    status: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ received: true, timestamp: now.toISOString(), webhookId }),
  };
}

/**
 * A named trigger is scoped to one entity type and a fixed list of signal types: it registers
 * exactly those with Lusha and drops any other signal type after verifying it (still
 * acknowledging it, as Lusha requires).
 */
export interface FixedScope {
  entityType: "contact" | "company";
  signalTypes: string[];
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** Set for a named trigger; unset for the Any-signal trigger (`signal-received`). */
  fixed?: FixedScope;
  /** The sample `trigger.event`; defaults to a contact promotion. */
  sample?: LushaSignal;
}

/** Build a Lusha signal webhook trigger: the Any-signal one, or a named one with `fixed`. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, LushaSignal, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.fixed
      ? [ENTITY_IDS_PARAM, SIGNING_SECRET_PARAM]
      : [ENTITY_TYPE_PARAM, ENTITY_IDS_PARAM, SIGNAL_TYPES_PARAM, SIGNING_SECRET_PARAM],
    output: OUTPUT,
    sample: spec.sample ?? SAMPLE,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const entityType = spec.fixed?.entityType ??
        (params.entityType === "company" ? "company" : "contact");
      const ids = strList(params.entityIds) ?? [];
      if (ids.length === 0) throw new Error("Give at least one Lusha contact or company id.");
      if (ids.length > MAX_ENTITIES) {
        throw new Error(`Lusha accepts up to ${MAX_ENTITIES} ids per trigger; got ${ids.length}.`);
      }
      const signalTypes = spec.fixed?.signalTypes ?? strList(params.signalTypes);
      const res = await new LushaClient(ctx).request<{ results?: unknown }>(
        "POST",
        "/api/subscriptions",
        {
          body: {
            defaults: {
              url: callbackUrl,
              entityType,
              ...(signalTypes ? { signalTypes } : {}),
            },
            subscriptions: ids.map((entityId) => ({ entityId })),
          },
        },
      );
      const results = Array.isArray(res.results) ? res.results : [];
      const made: string[] = [];
      let failed = 0;
      for (const r of results) {
        const sub = asObject(asObject(r)?.subscription);
        const id = asObject(r)?.success === true ? str(sub?.id) : null;
        if (id) made.push(id);
        else failed++;
      }
      if (made.length === 0 || failed > 0 || made.length !== ids.length) {
        // All or nothing: remove what was created so a half-registered trigger never lingers.
        if (made.length > 0) {
          try {
            await new LushaClient(ctx).request("POST", "/api/subscriptions/delete", {
              body: { ids: made },
            });
          } catch { /* best-effort rollback */ }
        }
        throw new Error(
          `Lusha created ${made.length} of ${ids.length} subscriptions; check the ids and the account's subscription limit.`,
        );
      }
      return { subscriptionIds: made };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const ids = (state as Partial<TriggerState> | undefined)?.subscriptionIds;
      if (!Array.isArray(ids) || ids.length === 0) return;
      const res = await new LushaClient(ctx).request<{ results?: unknown }>(
        "POST",
        "/api/subscriptions/delete",
        { body: { ids } },
      );
      for (const r of Array.isArray(res.results) ? res.results : []) {
        const o = asObject(r);
        if (o?.success === true) continue;
        // A subscription Lusha no longer has is already gone; anything else is a real failure.
        if (asObject(o?.error)?.code !== "NOT_FOUND") {
          throw new Error("Lusha could not delete one of the trigger's subscriptions.");
        }
      }
    },

    async handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Lusha delivers webhooks with POST, not ${raw.method}.`);
      }
      const parsed = await verifyDelivery(raw, params?.signingSecret);
      const signal = normalizeDelivery(parsed);
      const response = ackResponse(signal.id);
      // A named trigger acknowledges (Lusha requires it) but does not run for another signal type.
      if (spec.fixed && !spec.fixed.signalTypes.includes(signal.type ?? "")) {
        return { events: [], response };
      }
      return { events: [signal], response };
    },
  };
}
