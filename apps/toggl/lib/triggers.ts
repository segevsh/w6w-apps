import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";
import { TogglClient } from "./client.ts";

/**
 * Toggl Track webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` creates a workspace subscription filtered to one entity and action, with the
 *     user's `signingSecret` as its secret, then asks Toggl to PING it. A subscription only
 *     receives events once its URL is validated: Toggl's PING carries a `validation_code` and
 *     expects `{"validation_code": "<code>"}` back in the response body.
 *   - `handleIngest` verifies `X-Webhook-Signature-256` (`sha256=` + hex HMAC-SHA256 of the raw
 *     body) and the delivery's `timestamp` BEFORE it answers a PING or emits an event. The PING
 *     is signed like any delivery, so a forged one never gets the validation code echoed.
 *   - `onUnsubscribe` deletes the subscription; one Toggl no longer has counts as deleted.
 *
 * The secret is the user's, not generated per subscription: the PING arrives while `onSubscribe`
 * is still running, before the host has stored any subscription state, so a generated secret
 * could not yet be read back to verify that PING.
 *
 * Docs (verified 2026-11-09): https://engineering.toggl.com/docs/track/webhooks_start/ ,
 * .../validating_received_events/ , .../url_endpoint_validation/ , .../request_examples/
 */

export const WEBHOOKS_API = "https://api.track.toggl.com/webhooks/api/v1";

export interface TriggerParams {
  workspaceId?: string;
  signingSecret?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  subscriptionId: string;
  workspaceId: string;
  callbackUrl: string;
  entity: string;
  action: string;
}

/** The run's `trigger.event`: one Toggl event. */
export interface TogglEvent {
  eventId: string | null;
  entity: string;
  action: string;
  createdAt: string | null;
  workspaceId: string | null;
  creatorId: string | null;
  payload: unknown;
}

export const EVENT_OUTPUT: OutputField[] = [
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "entity", type: "string", label: "Entity" },
  { key: "action", type: "string", label: "Action" },
  { key: "createdAt", type: "string", label: "Event time" },
  { key: "workspaceId", type: "string", label: "Workspace ID" },
  { key: "creatorId", type: "string", label: "Changed by (user ID)" },
  { key: "payload", type: "object", label: "Record" },
];

export function sampleFor(entity: string, action: string): TogglEvent {
  return {
    eventId: "1234567",
    entity,
    action,
    createdAt: "2026-11-09T10:00:00.000Z",
    workspaceId: "123456",
    creatorId: "6",
    payload: entity === "project"
      ? { id: 99, name: "Website", workspace_id: 123456, active: true }
      : {
        id: 987654321,
        description: "Write docs",
        workspace_id: 123456,
        start: "2026-11-09T09:00:00Z",
        duration: 3600,
      },
  };
}

const PARAMS: Param[] = [
  {
    key: "workspaceId",
    label: "Workspace ID",
    type: "string",
    required: true,
    hint: "The Toggl Track workspace to watch (the number in the workspace's URL).",
  },
  {
    key: "signingSecret",
    label: "Signing secret",
    type: "secret",
    required: true,
    hint:
      "Any random string of 16 or more characters that you choose now. It is registered as the subscription's secret and Toggl signs every delivery with it.",
  },
];

/** The shortest signing secret accepted: a short one is guessable. */
const MIN_SECRET_LENGTH = 16;

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** TogglClient throws `Toggl <status> …`; a 404/410 means the subscription is already gone. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^Toggl (404|410) /.test(err.message);
}

async function deleteSubscription(
  client: TogglClient,
  workspaceId: string,
  subscriptionId: string,
): Promise<void> {
  try {
    await client.request(
      `${WEBHOOKS_API}/subscriptions/${encodeURIComponent(workspaceId)}/${
        encodeURIComponent(subscriptionId)
      }`,
      { method: "DELETE" },
    );
  } catch (err) {
    if (!isGone(err)) throw err;
  }
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** Toggl event-filter entity, e.g. `time_entry`. */
  entity: string;
  /** Toggl event-filter action: `created`, `updated` or `deleted`. */
  action: string;
}

/** Build one Toggl webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, TogglEvent, Partial<TriggerState>> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: PARAMS,
    output: EVENT_OUTPUT,
    sample: sampleFor(spec.entity, spec.action),

    async onSubscribe({ params, callbackUrl, subscriptionId }, ctx) {
      const workspaceId = params.workspaceId?.trim();
      if (!workspaceId || !/^\d+$/.test(workspaceId)) {
        throw new Error("Set Workspace ID to a Toggl workspace number.");
      }
      const secret = requireSecret(params.signingSecret);
      if (secret.length < MIN_SECRET_LENGTH) {
        throw new Error(`The signing secret must be at least ${MIN_SECRET_LENGTH} characters.`);
      }
      const client = new TogglClient(ctx);
      const created = await client.request<{ subscription_id?: unknown }>(
        `${WEBHOOKS_API}/subscriptions/${workspaceId}`,
        {
          method: "POST",
          body: {
            url_callback: callbackUrl,
            event_filters: [{ entity: spec.entity, action: spec.action }],
            enabled: true,
            description: `w6w ${subscriptionId}`,
            secret,
          },
        },
      );
      const toggl = str(created?.subscription_id);
      if (!toggl) {
        throw new Error("Toggl created the subscription but returned no subscription_id.");
      }
      try {
        // The PING is delivered to `handleIngest`, which answers its validation code.
        await client.request(`${WEBHOOKS_API}/ping/${workspaceId}/${toggl}`, { method: "POST" });
      } catch (err) {
        await deleteSubscription(client, workspaceId, toggl).catch(() => {});
        throw err;
      }
      return {
        subscriptionId: toggl,
        workspaceId,
        callbackUrl,
        entity: spec.entity,
        action: spec.action,
      };
    },

    async onUnsubscribe({ state }, ctx) {
      const id = str(state?.subscriptionId);
      const workspaceId = str(state?.workspaceId);
      if (id && workspaceId) await deleteSubscription(new TogglClient(ctx), workspaceId, id);
    },

    async handleIngest({ raw, params, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Toggl delivers webhooks with POST, not ${raw.method}.`);
      }
      const secret = requireSecret(params?.signingSecret);
      const body = requireRawBody(raw);
      const signature = header(raw, "x-webhook-signature-256");
      if (!signature) {
        throw new Error("Toggl delivery refused: the X-Webhook-Signature-256 is missing.");
      }
      const expected = "sha256=" + await hmac("SHA-256", secret, body, "hex");
      if (!timingSafeEqual(expected, signature.toLowerCase())) {
        throw new Error("Toggl delivery refused: the signature does not match.");
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Toggl delivery is not valid JSON.");
      }
      const d = asObject(parsed);
      if (!d) throw new Error("Toggl delivery is not an object.");
      // Replay guard: Toggl stamps the time of each (re)delivery attempt.
      const sentAt = typeof d.timestamp === "string" ? Date.parse(d.timestamp) : NaN;
      if (!withinTolerance(sentAt / 1000, Date.now())) {
        throw new Error("Toggl delivery refused: its timestamp is missing or outside the window.");
      }
      // A signed delivery meant for another endpoint or subscription is not ours.
      if (
        state?.callbackUrl && typeof d.url_callback === "string" &&
        d.url_callback !== state.callbackUrl
      ) {
        throw new Error("Toggl delivery is for another callback URL.");
      }
      const toggl = str(d.subscription_id);
      if (state?.subscriptionId && toggl && toggl !== state.subscriptionId) {
        throw new Error("Toggl delivery is for another subscription.");
      }
      if (d.payload === "ping") {
        const code = d.validation_code;
        if (typeof code !== "string" || code === "") return [];
        return {
          events: [],
          response: {
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ validation_code: code }),
          },
        };
      }
      const metadata = asObject(d.metadata);
      return [{
        eventId: str(d.event_id),
        entity: str(metadata?.model) ?? spec.entity,
        action: str(metadata?.action) ?? spec.action,
        createdAt: str(d.created_at),
        workspaceId: str(metadata?.workspace_id) ?? str(state?.workspaceId),
        creatorId: str(d.creator_id),
        payload: d.payload,
      }];
    },
  };
}
