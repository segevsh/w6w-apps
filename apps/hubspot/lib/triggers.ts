import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";

/**
 * HubSpot webhook triggers (manual-webhook form).
 *
 * HubSpot posts a JSON ARRAY of up to 100 event notifications to ONE target URL per app
 * (https://developers.hubspot.com/docs/api-reference/legacy/webhooks/guide, verified 2026-11-10).
 * A subscription lives on a HubSpot app, either a legacy private app (Development, Legacy apps,
 * the app's Webhooks tab: `.../private-apps/create-and-edit-webhook-subscriptions-in-private-apps`)
 * or a public app, so a w6w user sets the Target URL and the event subscriptions in HubSpot by
 * hand; there is no API a connection can use to do it. `onSubscribe` therefore makes no HubSpot
 * call and hands back the `callbackUrl` to paste.
 *
 * Signing (https://developers.hubspot.com/docs/apps/legacy-apps/authentication/validating-requests),
 * keyed by the app's client secret, which is not part of the connection, so the trigger takes it
 * as a secret param (D5 (2)):
 *   - `X-HubSpot-Signature-v3` (when present it is the ONLY accepted proof): base64 HMAC-SHA256 of
 *     `method + uri + body + X-HubSpot-Request-Timestamp`, timestamp in milliseconds and refused
 *     when more than five minutes old. `uri` is the Target URL the user configured (HubSpot's
 *     listed percent-escapes decoded), which `onSubscribe` recorded.
 *   - otherwise `X-HubSpot-Signature` with `X-HubSpot-Signature-Version: v1`: hex SHA-256 of
 *     `client secret + body`. v1 carries no timestamp, so it has no replay window; every event
 *     carries its `eventId` and `attemptNumber` for a workflow that must drop a repeat, and any
 *     other signature version (v2 belongs to workflow webhook actions) is refused.
 * Verification runs over the raw body BEFORE anything is parsed.
 */

export const SIGNATURE_WINDOW_SEC = 300;

export interface WebhookParams {
  signingSecret?: string;
  /** Any-event trigger: comma-separated HubSpot event types; empty = all. */
  events?: string;
  /** Property-change triggers: comma-separated property names; empty = all. */
  properties?: string;
}

export interface WebhookState {
  callbackUrl: string;
}

export interface HubSpotWebhookEvent {
  eventId: string | null;
  eventType: string;
  objectType: string | null;
  objectTypeId: string | null;
  objectId: string | null;
  portalId: string | null;
  appId: string | null;
  subscriptionId: string | null;
  occurredAt: number | null;
  attemptNumber: number | null;
  changeSource: string | null;
  propertyName: string | null;
  propertyValue: string | null;
  event: Record<string, unknown>;
}

const SIGNING_SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "App client secret",
  type: "secret",
  required: true,
  hint:
    "The client secret of the HubSpot app that sends the webhooks: a legacy private app's Auth tab, Show secret; a public app's Auth tab, Client secret. HubSpot signs every delivery with it; a delivery that does not verify is refused.",
};

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Event types",
  type: "string",
  advanced: true,
  placeholder: "contact.creation, deal.propertyChange",
  hint:
    "Comma-separated HubSpot event types to fire on (contact.creation, deal.deletion, conversation.newMessage, object.merge...). Leave empty for every event the app is subscribed to.",
};

const PROPERTIES_PARAM: Param = {
  key: "properties",
  label: "Properties",
  type: "string",
  advanced: true,
  placeholder: "lifecyclestage, dealstage",
  hint:
    "Comma-separated property names. HubSpot sends one notification per changed property; only these fire. Leave empty for every property the app is subscribed to.",
};

export const EVENT_OUTPUT: OutputField[] = [
  { key: "eventId", type: "string", label: "Event ID (not guaranteed unique)" },
  { key: "eventType", type: "string", label: "Event Type" },
  { key: "objectType", type: "string", label: "Object Type" },
  { key: "objectTypeId", type: "string", label: "Object Type ID" },
  { key: "objectId", type: "string", label: "Object ID" },
  { key: "portalId", type: "string", label: "Account ID" },
  { key: "appId", type: "string", label: "App ID" },
  { key: "subscriptionId", type: "string", label: "Subscription ID" },
  { key: "occurredAt", type: "number", label: "Occurred At (epoch ms)" },
  { key: "attemptNumber", type: "number", label: "Delivery Attempt" },
  { key: "changeSource", type: "string", label: "Change Source" },
  { key: "propertyName", type: "string", label: "Property Name" },
  { key: "propertyValue", type: "string", label: "New Property Value" },
  { key: "event", type: "object", label: "Raw Notification" },
];

/** HubSpot object type ids (https://developers.hubspot.com/docs/api/webhooks, verified 2026-11-10). */
const OBJECT_TYPES: Record<string, string> = {
  "0-1": "contact",
  "0-2": "company",
  "0-3": "deal",
  "0-5": "ticket",
  "0-7": "product",
  "0-8": "line_item",
  "0-11": "conversation",
};

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function list(raw: unknown): string[] {
  return typeof raw === "string" ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

const URI_UNESCAPES: Array<[RegExp, string]> = [
  [/%3A/gi, ":"],
  [/%2F/gi, "/"],
  [/%3F/gi, "?"],
  [/%40/gi, "@"],
  [/%21/gi, "!"],
  [/%24/gi, "$"],
  [/%27/gi, "'"],
  [/%28/gi, "("],
  [/%29/gi, ")"],
  [/%2A/gi, "*"],
  [/%2C/gi, ","],
  [/%3B/gi, ";"],
];

/** The request URI the way HubSpot's v3 recipe wants it: the listed percent-escapes decoded. */
export function v3Uri(url: string): string {
  return URI_UNESCAPES.reduce((u, [re, to]) => u.replace(re, to), url);
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Throws unless the delivery carries a valid HubSpot signature over the raw body. */
export async function verifyHubSpotSignature(
  raw: { rawBody?: unknown; method: string; headers: Record<string, string> },
  signingSecret: unknown,
  callbackUrl: unknown,
  nowMs: number = Date.now(),
): Promise<string> {
  const secret = requireSecret(signingSecret);
  const body = requireRawBody(raw);
  const v3 = header(raw, "x-hubspot-signature-v3");
  if (v3 !== undefined) {
    const timestamp = header(raw, "x-hubspot-request-timestamp");
    if (!v3 || !timestamp || !/^\d+$/.test(timestamp)) {
      throw new Error("HubSpot delivery refused: the v3 signature headers are missing.");
    }
    if (!withinTolerance(Number(timestamp) / 1000, nowMs, SIGNATURE_WINDOW_SEC)) {
      throw new Error(
        "HubSpot delivery refused: the request timestamp is outside the allowed window.",
      );
    }
    if (typeof callbackUrl !== "string" || callbackUrl === "") {
      throw new Error("HubSpot delivery refused: the subscription has no recorded target URL.");
    }
    const expected = await hmac(
      "SHA-256",
      secret,
      `${raw.method.toUpperCase()}${v3Uri(callbackUrl)}${body}${timestamp}`,
      "base64",
    );
    if (!timingSafeEqual(expected, v3)) {
      throw new Error("HubSpot delivery refused: the signature does not match.");
    }
    return body;
  }
  const v1 = header(raw, "x-hubspot-signature");
  if (!v1) throw new Error("HubSpot delivery refused: the signature headers are missing.");
  if (header(raw, "x-hubspot-signature-version") !== "v1") {
    throw new Error("HubSpot delivery refused: the signature version is not supported.");
  }
  if (!timingSafeEqual(await sha256Hex(secret + body), v1.toLowerCase())) {
    throw new Error("HubSpot delivery refused: the signature does not match.");
  }
  return body;
}

/** Turns one notification into the run's event; generic `object.*` types are named by object. */
export function normalizeEvent(n: Record<string, unknown>): HubSpotWebhookEvent {
  const objectTypeId = str(n.objectTypeId);
  let eventType = str(n.eventType) ?? str(n.subscriptionType) ?? "unknown";
  let objectType = eventType.includes(".") ? eventType.split(".")[0] : null;
  if (eventType.startsWith("object.") && objectTypeId && OBJECT_TYPES[objectTypeId]) {
    objectType = OBJECT_TYPES[objectTypeId];
    eventType = `${objectType}.${eventType.slice("object.".length)}`;
  } else if (objectType === "object") {
    objectType = objectTypeId;
  }
  return {
    eventId: str(n.eventId),
    eventType,
    objectType,
    objectTypeId,
    objectId: str(n.objectId),
    portalId: str(n.portalId),
    appId: str(n.appId),
    subscriptionId: str(n.subscriptionId),
    occurredAt: num(n.occurredAt),
    attemptNumber: num(n.attemptNumber),
    changeSource: str(n.changeSource),
    propertyName: str(n.propertyName),
    propertyValue: str(n.propertyValue),
    event: n,
  };
}

export interface HubSpotWebhookSpec {
  key: string;
  title: string;
  description: string;
  /** The event types this trigger fires on; omitted for the Any-event trigger. */
  types?: string[];
  /** Offer the `properties` filter (property-change events). */
  propertyFilter?: boolean;
  /** A representative raw notification for the sample. */
  sampleEvent: Record<string, unknown>;
}

export function hubspotWebhookTrigger(
  spec: HubSpotWebhookSpec,
): TriggerDefinition<WebhookParams, HubSpotWebhookEvent, WebhookState> {
  const params: Param[] = [SIGNING_SECRET_PARAM];
  if (!spec.types) params.push(EVENTS_PARAM);
  if (spec.propertyFilter) params.push(PROPERTIES_PARAM);

  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params,
    output: EVENT_OUTPUT,
    sample: normalizeEvent(spec.sampleEvent),

    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params, state }) {
      const body = await verifyHubSpotSignature(raw, params?.signingSecret, state?.callbackUrl);
      let payload: unknown;
      try {
        payload = JSON.parse(body);
      } catch {
        throw new Error("HubSpot delivery refused: the body is not JSON.");
      }
      const notifications = Array.isArray(payload) ? payload : [payload];
      const wantedEvents = spec.types ?? list(params?.events);
      const wantedProps = spec.propertyFilter ? list(params?.properties) : [];
      const out: HubSpotWebhookEvent[] = [];
      for (const n of notifications) {
        const obj = asObject(n);
        if (!obj) continue;
        const event = normalizeEvent(obj);
        if (wantedEvents.length > 0 && !wantedEvents.includes(event.eventType)) continue;
        if (wantedProps.length > 0 && !wantedProps.includes(event.propertyName ?? "")) continue;
        out.push(event);
      }
      return out;
    },
  };
}
