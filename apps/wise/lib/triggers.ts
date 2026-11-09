import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";

/**
 * Wise webhook triggers: a manual-webhook receiver
 * (https://docs.wise.com/guides/developer/webhooks, verified 2026-11-09).
 *
 * Wise subscriptions are application-level (client credentials from a Wise Platform partner
 * agreement) or profile-level (a user token); this app's personal API token reaches neither,
 * so w6w cannot register the webhook for the user. They create the subscription themselves, in
 * Developer Hub, pointing at the callback URL this trigger shows. `onSubscribe` therefore makes
 * no Wise call and `onUnsubscribe` is a no-op.
 *
 * Wise signs every request (`X-Signature-SHA256`: Base64 RSA-SHA256, PKCS#1 v1.5, over the
 * request body) with a key pair whose public half it PUBLISHES, one for production and one for
 * the sandbox. `handleIngest` verifies the signature over the raw bytes with the pinned public
 * key before anything is parsed; a delivery that does not verify throws. There is no shared
 * secret to configure, so none is accepted or needed: the key is Wise's, in this file.
 *
 * One signature is not enough: Wise signs EVERY customer's webhooks with that same key, so a valid
 * signature proves "Wise sent this", not "this is the account you set up". Anyone who learns a
 * callback URL could create their own Wise subscription pointing at it and have Wise deliver
 * genuinely signed events about THEIR account. So the user also pastes their Wise profile ID
 * (`profileId` param), and after the signature verifies, the profile the delivery's own signed body
 * names (a per-event field of `data`, see `WebhookTriggerSpec.profilePath`; docs.wise.com
 * /api-reference/webhook-event/*, verified 2026-11-09) must equal it exactly. A missing or empty
 * configured ID, or a body without the profile field, refuses the delivery. The profile id is
 * bound rather than the subscription id because it exists BEFORE the callback URL is registered
 * and never changes on a republish (Wise has no update-subscription call, and the host replaces a
 * webhook row, so a new URL, whenever its params change).
 *
 * Wise defines no replay window to enforce: `sent_at` is in the signed body, but Wise retries a
 * failed delivery for up to two weeks and says events arrive out of order "due to retries", so a
 * freshness limit would drop legitimate retries. Every event carries `deliveryId` for skipping
 * a duplicate.
 */

/** Wise's production webhook public key (docs.wise.com/guides/developer/webhooks/event-handling). */
export const WISE_LIVE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvO8vXV+JksBzZAY6GhSO
XdoTCfhXaaiZ+qAbtaDBiu2AGkGVpmEygFmWP4Li9m5+Ni85BhVvZOodM9epgW3F
bA5Q1SexvAF1PPjX4JpMstak/QhAgl1qMSqEevL8cmUeTgcMuVWCJmlge9h7B1CS
D4rtlimGZozG39rUBDg6Qt2K+P4wBfLblL0k4C4YUdLnpGYEDIth+i8XsRpFlogx
CAFyH9+knYsDbR43UJ9shtc42Ybd40Afihj8KnYKXzchyQ42aC8aZ/h5hyZ28yVy
Oj3Vos0VdBIs/gAyJ/4yyQFCXYte64I7ssrlbGRaco4nKF3HmaNhxwyKyJafz19e
HwIDAQAB
-----END PUBLIC KEY-----`;

/** Wise's sandbox webhook public key (same page). */
export const WISE_SANDBOX_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwpb91cEYuyJNQepZAVfP
ZIlPZfNUefH+n6w9SW3fykqKu938cR7WadQv87oF2VuT+fDt7kqeRziTmPSUhqPU
ys/V2Q1rlfJuXbE+Gga37t7zwd0egQ+KyOEHQOpcTwKmtZ81ieGHynAQzsn1We3j
wt760MsCPJ7GMT141ByQM+yW1Bx+4SG3IGjXWyqOWrcXsxAvIXkpUD/jK/L958Cg
nZEgz0BSEh0QxYLITnW1lLokSx/dTianWPFEhMC9BgijempgNXHNfcVirg1lPSyg
z7KqoKUN0oHqWLr2U1A+7kqrl6O2nx3CKs1bj1hToT1+p4kcMoHXA7kA+VBLUpEs
VwIDAQAB
-----END PUBLIC KEY-----`;

export type WiseEnvironment = "live" | "sandbox";

export interface PublicKeys {
  live: string;
  sandbox: string;
}

export const WISE_PUBLIC_KEYS: PublicKeys = {
  live: WISE_LIVE_PUBLIC_KEY,
  sandbox: WISE_SANDBOX_PUBLIC_KEY,
};

export interface TriggerParams {
  /** Which Wise environment signs the deliveries; selects the public key. Default `live`. */
  environment?: string;
  /** The user's own Wise profile ID; deliveries naming any other profile are refused. */
  profileId?: string;
}

/** What `onSubscribe` returns: the URL the user pastes into Wise's Developer Hub. */
export interface TriggerState {
  callbackUrl: string;
}

/** The run's `trigger.event`: the Wise event notification. */
export interface WiseEvent {
  eventType: string;
  deliveryId: string | null;
  subscriptionId: string | null;
  schemaVersion: string | null;
  sentAt: string | null;
  data: Record<string, unknown>;
}

const ENVIRONMENT_PARAM: Param = {
  key: "environment",
  label: "Wise environment",
  type: "select",
  default: "live",
  options: [
    { value: "live", label: "Live (wise.com)" },
    { value: "sandbox", label: "Sandbox (sandbox.transferwise.tech)" },
  ],
  hint:
    "Which Wise environment sends the webhook; it decides the public key deliveries are checked against.",
};

const PROFILE_ID_PARAM: Param = {
  key: "profileId",
  label: "Wise profile ID",
  type: "string",
  required: true,
  hint:
    "The numeric ID of the Wise profile (personal or business) whose events this trigger should receive: run this app's Profile List action, or find it in Wise under your profile's settings or in the URL. Deliveries naming any other profile are refused.",
};

const EVENT_OUTPUT: OutputField[] = [
  { key: "eventType", type: "string", label: "Event Type" },
  { key: "deliveryId", type: "string", label: "Delivery ID" },
  { key: "subscriptionId", type: "string", label: "Subscription ID" },
  { key: "schemaVersion", type: "string", label: "Schema Version" },
  { key: "sentAt", type: "string", label: "Sent At" },
  { key: "data", type: "object", label: "Event Data" },
];

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

/** PEM `SPKI` public key → DER bytes. */
function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const b64 = pem.replace(/-----(BEGIN|END) PUBLIC KEY-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Standard padded Base64 only; anything else cannot be a signature. */
function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> | null {
  if (b64.length === 0 || b64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return null;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** True when `signatureB64` is a valid RSA-SHA256 (PKCS#1 v1.5) signature of `body` under `pem`. */
export async function verifyRsaSha256(
  pem: string,
  body: string,
  signatureB64: string,
): Promise<boolean> {
  const signature = base64ToBytes(signatureB64);
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "spki",
    pemToDer(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    signature,
    new TextEncoder().encode(body),
  );
}

/** The value at `path` below `root`, or undefined when any step is not an object. */
function at(root: unknown, path: readonly string[]): unknown {
  let cur: unknown = root;
  for (const k of path) {
    const o = asObject(cur);
    if (!o || !Object.hasOwn(o, k)) return undefined;
    cur = o[k];
  }
  return cur;
}

/**
 * Throw unless `delivered` (the profile id in the signed body) is exactly the `configured` ID.
 * An unset, blank or non-string configured ID never matches (no fail-open), a delivered id that is
 * not a non-empty string or a safe integer never matches, and both sides are compared as strings.
 * The messages name the profile and echo neither value.
 */
function assertOwnProfile(configured: unknown, delivered: unknown): void {
  let expected: string;
  try {
    expected = requireSecret(typeof configured === "string" ? configured.trim() : configured);
  } catch {
    throw new Error("Wise delivery refused: the Wise profile ID is not configured.");
  }
  const got = typeof delivered === "string" && delivered !== ""
    ? delivered
    : typeof delivered === "number" && Number.isSafeInteger(delivered)
    ? String(delivered)
    : null;
  if (got === null || !timingSafeEqual(got, expected)) {
    throw new Error("Wise delivery refused: it is not for the configured Wise profile.");
  }
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The one Wise event type (`trigger_on`) this trigger fires on. */
  eventType: string;
  /**
   * Where the signed body names the profile the event is about: a path below `data` (Wise's
   * per-event payload, e.g. `["resource", "profile_id"]`). The event is refused unless it holds.
   */
  profilePath: readonly string[];
  /** When set, `data.resource.type` must equal it (a profile event's `resource.id` is a profile). */
  resourceType?: string;
  /** The schema version the sample (and `profilePath`) documents. Default `4.0.0`. */
  schemaVersion?: string;
  /** A representative `data` for the sample. */
  sampleData: Record<string, unknown>;
}

/**
 * Build one Wise webhook trigger. `keys` is the public key pair deliveries are verified
 * against; only a test passes anything but Wise's published keys.
 */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
  keys: PublicKeys = WISE_PUBLIC_KEYS,
): TriggerDefinition<TriggerParams, WiseEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [ENVIRONMENT_PARAM, PROFILE_ID_PARAM],
    output: EVENT_OUTPUT,
    sample: {
      eventType: spec.eventType,
      deliveryId: "5a1d3c70-2b8e-4a6f-9f0e-7c2d1e4b8a93",
      subscriptionId: "01234567-89ab-cdef-0123-456789abcdef",
      schemaVersion: spec.schemaVersion ?? "4.0.0",
      sentAt: "2026-11-09T10:12:50.123Z",
      data: spec.sampleData,
    } satisfies WiseEvent,

    // Manual webhook: nothing to register with Wise; hand back the URL to paste in Developer Hub.
    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Wise delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = requireRawBody(raw);
      const environment = params?.environment ?? "live";
      if (environment !== "live" && environment !== "sandbox") {
        throw new Error("Wise delivery refused: the Wise environment is not live or sandbox.");
      }
      const signature = header(raw, "x-signature-sha256");
      if (signature === undefined || signature === "") {
        throw new Error("Wise delivery refused: the X-Signature-SHA256 header is missing.");
      }
      let verified = false;
      try {
        verified = await verifyRsaSha256(keys[environment], body, signature.trim());
      } catch {
        verified = false;
      }
      if (!verified) throw new Error("Wise delivery refused: the signature does not match.");

      // Verified.
      let event: Record<string, unknown> | null;
      try {
        event = asObject(JSON.parse(body));
      } catch {
        event = null;
      }
      const eventType = str(event?.event_type);
      if (!event || !eventType) {
        throw new Error("Not a Wise event notification: expected an object with event_type.");
      }
      // Another event type starts nothing here (and has no field this trigger knows to bind on).
      if (eventType !== spec.eventType) return [];
      // Bind the delivery to the user's own profile (read from the SIGNED body, nowhere else).
      if (spec.resourceType !== undefined) {
        if (at(event.data, ["resource", "type"]) !== spec.resourceType) {
          throw new Error("Wise delivery refused: it is not for the configured Wise profile.");
        }
      }
      assertOwnProfile(params?.profileId, at(event.data, spec.profilePath));

      // A test notification (sent when the subscription is created) starts no run.
      if (header(raw, "x-test-notification")?.toLowerCase() === "true") return [];
      return [{
        eventType,
        deliveryId: str(header(raw, "x-delivery-id")),
        subscriptionId: str(event.subscription_id),
        schemaVersion: str(event.schema_version),
        sentAt: str(event.sent_at),
        data: asObject(event.data) ?? {},
      }];
    },
  };
}
