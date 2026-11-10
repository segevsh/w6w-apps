import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { FivetranClient } from "./client.ts";

/**
 * Fivetran webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` creates a webhook for ONE event with `POST /v1/webhooks/account` (or
 *     `/v1/webhooks/group/{groupId}` when a destination is chosen), choosing a random
 *     per-subscription `secret` (D5 (1)) that it keeps in subscription state. `onUnsubscribe`
 *     deletes it with `DELETE /v1/webhooks/{id}`; one Fivetran no longer has counts as deleted.
 *   - `handleIngest` verifies `X-Fivetran-Signature-256` (hex HMAC-SHA256 of the exact request body
 *     under the secret; Fivetran's own examples compare case-insensitively) BEFORE it parses
 *     anything, then emits one event. The scheme carries no timestamp, so there is no replay window.
 *
 * Docs (verified 2026-11-10): https://fivetran.com/docs/developer-resources/webhooks ,
 * https://fivetran.com/assets-docs/openapi/file_v1.yaml (`/v1/webhooks/account`,
 * `/v1/webhooks/group/{groupId}`, `/v1/webhooks/{webhookId}`) and Fivetran's receiver example
 * https://github.com/fivetran/fivetran-webhook-example-express-js (header name).
 */

export interface TriggerParams {
  /** Destination (group) id; blank = an account-wide webhook. */
  groupId?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  secret: string;
}

/** The run's `trigger.event`: one Fivetran webhook payload. */
export interface FivetranEvent {
  event: string;
  created: string | null;
  connectorType: string | null;
  connectorId: string | null;
  connectorName: string | null;
  syncId: string | null;
  destinationGroupId: string | null;
  data: Record<string, unknown>;
}

const GROUP_PARAM: Param = {
  key: "groupId",
  label: "Destination (group) ID",
  type: "string",
  required: false,
  hint:
    "Only fire for connections in this destination (the group id from Get Many Destinations). Leave blank to fire for the whole account.",
};

const OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event" },
  { key: "created", type: "string", label: "Created (ISO 8601)" },
  { key: "connectorType", type: "string", label: "Connector Type" },
  { key: "connectorId", type: "string", label: "Connection ID" },
  { key: "connectorName", type: "string", label: "Connection Name" },
  { key: "syncId", type: "string", label: "Sync ID" },
  { key: "destinationGroupId", type: "string", label: "Destination (Group) ID" },
  { key: "data", type: "object", label: "Event Data" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** True for the "no such webhook" answers `FivetranClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^Fivetran (404|410)\b/.test(err.message);
}

/** The delivery body → its event. Throws on a body that is not a Fivetran webhook payload. */
export function normalizeDelivery(body: unknown): FivetranEvent {
  const d = asObject(body);
  const event = str(d?.event);
  if (!d || !event) throw new Error("Not a Fivetran webhook delivery: expected `event`.");
  return {
    event,
    created: str(d.created),
    connectorType: str(d.connector_type),
    connectorId: str(d.connector_id),
    connectorName: str(d.connector_name),
    syncId: str(d.sync_id),
    destinationGroupId: str(d.destination_group_id),
    data: asObject(d.data) ?? {},
  };
}

/**
 * Check `X-Fivetran-Signature-256` against the exact bytes received. Throws (never echoing the
 * secret, the signature or the header) unless it matches; an unset secret is refused before any
 * compare. Returns the verified body text.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const given = header(raw, "x-fivetran-signature-256");
  if (given === undefined || given === "") {
    throw new Error("Fivetran delivery refused: the X-Fivetran-Signature-256 header is missing.");
  }
  const expected = await hmac("SHA-256", key, body, "hex");
  if (!timingSafeEqual(expected, given.trim().toLowerCase())) {
    throw new Error("Fivetran delivery refused: the signature does not match.");
  }
  return body;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The Fivetran event name this trigger subscribes to (and keeps). */
  eventName: string;
  sample: FivetranEvent;
}

/** Build one Fivetran event webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, FivetranEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [GROUP_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const groupId = params?.groupId?.trim();
      const secret = randomSecret();
      const created = await new FivetranClient(ctx).request<{ id?: unknown }>(
        groupId ? `/v1/webhooks/group/${encodeURIComponent(groupId)}` : "/v1/webhooks/account",
        {
          method: "POST",
          body: { url: callbackUrl, events: [spec.eventName], active: true, secret },
        },
      );
      const webhookId = str(created?.id);
      if (!webhookId) throw new Error("Fivetran did not return the id of the webhook it created.");
      return { webhookId, secret };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.webhookId) return;
      try {
        await new FivetranClient(ctx).request(`/v1/webhooks/${encodeURIComponent(s.webhookId)}`, {
          method: "DELETE",
        });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Fivetran delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, state?.secret);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Fivetran delivery refused: the body is not JSON.");
      }
      const event = normalizeDelivery(parsed);
      if (event.event !== spec.eventName) return [];
      return [event];
    },
  };
}
