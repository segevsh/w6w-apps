import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import { requireSecret, timingSafeEqual } from "../../_shared/webhook/mod.ts";

/**
 * Strava push-subscription triggers (rfcs/trigger.md, webhook form).
 *
 * Strava allows ONE push subscription per API application and creates it with the application's
 * `client_id` + `client_secret`, neither of which a connection holds (the connection carries an
 * athlete's access token). So this is a manual-webhook receiver: `onSubscribe` makes no vendor
 * call and just keeps the host's `callbackUrl`; the user registers that URL with Strava once
 * (see the README) using the SAME `verify_token` they paste into the trigger's `verifyToken`
 * parameter.
 *
 *   - GET (the subscription handshake): Strava sends `hub.mode=subscribe`, `hub.challenge` and
 *     `hub.verify_token`. The challenge is echoed as `{"hub.challenge": "<challenge>"}` ONLY
 *     when `hub.verify_token` equals the configured `verifyToken`.
 *   - POST (an event): Strava documents no signature on deliveries, so the callback URL is the
 *     secret. The body must be a well-formed event for the object/aspect this trigger watches.
 */

export interface TriggerParams {
  verifyToken?: string;
  ownerId?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  callbackUrl: string;
}

/** A Strava push event, camelCased. */
export interface StravaEvent {
  aspectType: string;
  objectType: string;
  objectId: number;
  ownerId: number;
  eventTime: number;
  subscriptionId: number | null;
  updates: Record<string, unknown>;
}

const VERIFY_TOKEN_PARAM: Param = {
  key: "verifyToken",
  label: "Verify token",
  type: "secret",
  required: true,
  hint:
    "The `verify_token` you give Strava when creating the push subscription. Pick any long random string; paste the same value here.",
};

const OWNER_PARAM: Param = {
  key: "ownerId",
  label: "Athlete ID",
  type: "string",
  hint: "Only fire for this athlete (the event's owner_id). Leave blank for every athlete.",
};

export const EVENT_OUTPUT: OutputField[] = [
  { key: "aspectType", type: "string", label: "Aspect (create, update, delete)" },
  { key: "objectType", type: "string", label: "Object (activity, athlete)" },
  { key: "objectId", type: "number", label: "Activity or athlete ID" },
  { key: "ownerId", type: "number", label: "Athlete ID" },
  { key: "eventTime", type: "number", label: "Event time (Unix seconds)" },
  { key: "subscriptionId", type: "number", label: "Subscription ID" },
  { key: "updates", type: "object", label: "Changed fields (update events)" },
];

const MAX_CHALLENGE_LENGTH = 256;

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

/** The delivery body, whether the listener parsed it as JSON or kept it as text. */
function deliveryBody(body: unknown): Record<string, unknown> | null {
  if (typeof body === "string") {
    try {
      return asObject(JSON.parse(body));
    } catch {
      return null;
    }
  }
  return asObject(body);
}

function int(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  objectType: "activity" | "athlete";
  aspectType: "create" | "update" | "delete";
  sample: StravaEvent;
}

type Ingest = NonNullable<
  TriggerDefinition<TriggerParams, StravaEvent, TriggerState>["handleIngest"]
>;

/** Build one Strava webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, StravaEvent, TriggerState> {
  const handleIngest: Ingest = ({ raw, params }) => {
    const method = String(raw.method).toUpperCase();

    if (method === "GET") {
      // The subscription handshake. Refuse before touching the challenge if there is no configured
      // token to compare against (an unset secret must never equal an absent query value).
      const expected = requireSecret(params.verifyToken);
      if (raw.query["hub.mode"] !== "subscribe") {
        throw new Error("Strava validation refused: not a subscription handshake.");
      }
      if (!timingSafeEqual(raw.query["hub.verify_token"] as string, expected)) {
        throw new Error("Strava validation refused: the verify token did not match.");
      }
      const challenge = raw.query["hub.challenge"];
      if (
        typeof challenge !== "string" || challenge === "" || challenge.length > MAX_CHALLENGE_LENGTH
      ) {
        throw new Error("Strava validation refused: the challenge is missing or malformed.");
      }
      return {
        events: [],
        response: {
          status: 200,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ "hub.challenge": challenge }),
        },
      };
    }

    if (method !== "POST") throw new Error("Strava delivers events with POST.");
    const body = deliveryBody(raw.body);
    const objectType = body?.object_type;
    const aspectType = body?.aspect_type;
    const objectId = int(body?.object_id);
    const ownerId = int(body?.owner_id);
    const eventTime = int(body?.event_time);
    if (
      !body || typeof objectType !== "string" || typeof aspectType !== "string" ||
      objectId === null || ownerId === null || eventTime === null
    ) {
      throw new Error(
        "Not a Strava event: expected object_type, aspect_type, object_id, owner_id and event_time.",
      );
    }
    if (objectType !== spec.objectType || aspectType !== spec.aspectType) return [];
    const wanted = params.ownerId?.trim();
    if (wanted && wanted !== String(ownerId)) return [];
    return [{
      aspectType,
      objectType,
      objectId,
      ownerId,
      eventTime,
      subscriptionId: int(body.subscription_id),
      updates: asObject(body.updates) ?? {},
    }];
  };

  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [VERIFY_TOKEN_PARAM, OWNER_PARAM],
    output: EVENT_OUTPUT,
    sample: spec.sample,

    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },
    onUnsubscribe() {},
    handleIngest,
  };
}
