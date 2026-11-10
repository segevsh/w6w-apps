import type { HookContext, OutputField, Param, TriggerCall, TriggerDefinition } from "@w6w/types";
import {
  header,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import transferList from "../actions/transfer-list.ts";

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
    "The numeric ID of the Wise profile (personal or business) whose events this trigger should receive: run this app's List Profiles action. Deliveries naming any other profile are refused.",
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

/**
 * The Wise signature check shared by every trigger: POST only, the raw body, the
 * `X-Signature-SHA256` header verified (RSA-SHA256, PKCS#1 v1.5) against the pinned public key of
 * the chosen environment, THEN the body parsed into an event notification. Throws on anything else.
 */
async function verifyDelivery(
  raw: TriggerCall,
  params: TriggerParams | undefined,
  keys: PublicKeys,
): Promise<{ event: Record<string, unknown>; eventType: string }> {
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
  return { event, eventType };
}

/** The run's event from a verified, profile-bound notification. */
function toWiseEvent(
  raw: TriggerCall,
  event: Record<string, unknown>,
  eventType: string,
): WiseEvent {
  return {
    eventType,
    deliveryId: str(header(raw, "x-delivery-id")),
    subscriptionId: str(event.subscription_id),
    schemaVersion: str(event.schema_version),
    sentAt: str(event.sent_at),
    data: asObject(event.data) ?? {},
  };
}

/** Where each profile-bound event names the profile its signed body is about. */
export interface ProfileBinding {
  path: readonly string[];
  /** When set, `data.resource.type` must equal it (a profile event's `resource.id` is a profile). */
  resourceType?: string;
}

/** Throws unless the bound profile is the user's own (see `assertOwnProfile`). */
function bindProfile(
  params: TriggerParams | undefined,
  event: Record<string, unknown>,
  binding: ProfileBinding,
): void {
  if (binding.resourceType !== undefined) {
    if (at(event.data, ["resource", "type"]) !== binding.resourceType) {
      throw new Error("Wise delivery refused: it is not for the configured Wise profile.");
    }
  }
  assertOwnProfile(params?.profileId, at(event.data, binding.path));
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
  /**
   * Narrows the one event type to a subset (e.g. only credits of `balances#update`). Runs after the
   * signature and the profile binding, on the signed `data`; false = acknowledged with no event.
   */
  accept?: (data: Record<string, unknown>) => boolean;
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
      const { event, eventType } = await verifyDelivery(raw, params, keys);
      // Another event type starts nothing here (and has no field this trigger knows to bind on).
      if (eventType !== spec.eventType) return [];
      // Bind the delivery to the user's own profile (read from the SIGNED body, nowhere else).
      bindProfile(params, event, { path: spec.profilePath, resourceType: spec.resourceType });
      if (spec.accept && !spec.accept(asObject(event.data) ?? {})) return [];

      // A test notification (sent when the subscription is created) starts no run.
      if (header(raw, "x-test-notification")?.toLowerCase() === "true") return [];
      return [toWiseEvent(raw, event, eventType)];
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Any Event: one trigger for every signed event whose body names the user's profile.
// ---------------------------------------------------------------------------------------------

/**
 * The event types the Any Event trigger can deliver, and where each one's SIGNED body names the
 * profile (docs.wise.com/api-reference/webhook-event/*, verified 2026-11-10). An event type that
 * is not listed cannot be tied to the user's own account, so it is refused at subscribe time and
 * never delivered: a valid Wise signature proves "Wise sent this", not "this is your account".
 *
 * Selection rule: an event is listed when Wise delivers it on a PROFILE-level subscription (each
 * event page states "Profile level subscriptions: Supported") AND its signed body documents the
 * profile id. That is every profile-level event except `incoming-transfer#credited` (its body
 * carries only an incoming-transfer id). The two `profiles#*` events are the exception: Wise
 * offers them at application level only, but they are kept because `profile-state-changed` has
 * always shipped and the body names the profile (`resource.id`, `resource.type: profile`). The
 * other application-level events (cards, balance account state, batch payments, KYC reviews,
 * disputes, account-details orders, partner, settlement) need a Wise Platform application
 * subscription and are not listed, even where their payload carries a profile id.
 */
export const EVENT_BINDINGS: Readonly<Record<string, ProfileBinding>> = {
  "transfers#state-change": { path: ["resource", "profile_id"] },
  "transfers#active-cases": { path: ["resource", "profile_id"] },
  "transfers#payout-failure": { path: ["profile_id"] },
  "transfers#refund": { path: ["resource", "profile_id"] },
  "balances#update": { path: ["resource", "profile_id"] },
  "profiles#state-change": { path: ["resource", "id"], resourceType: "profile" },
  "profiles#verification-state-change": { path: ["resource", "id"], resourceType: "profile" },
  "hold-limit-breach#update": { path: ["resource", "profile_id"] },
  "account-details-payment#state-change": { path: ["resource", "profile_id"] },
  "swift-in#credit": { path: ["action", "profile_id"] },
  "swift#message-received": { path: ["action", "profile_id"] },
  "recipients#state-change": { path: ["resource", "data", "profileId"] },
};

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  hint: `Comma-separated Wise event types to receive (${
    Object.keys(EVENT_BINDINGS).join(", ")
  }). Leave empty for all of them. Subscribe the callback URL in Wise's Developer Hub to the same events.`,
};

/** The comma-separated `events` param → the event types to deliver (empty = all bindable). */
export function chooseEvents(events: string | undefined): string[] {
  const asked = (events ?? "").split(",").map((e) => e.trim()).filter((e) => e !== "");
  if (asked.length === 0) return Object.keys(EVENT_BINDINGS);
  const bad = asked.filter((e) => !Object.hasOwn(EVENT_BINDINGS, e));
  if (bad.length > 0) {
    throw new Error(
      `Wise events this trigger cannot tie to your profile (or does not know): ${bad.join(", ")}.`,
    );
  }
  return [...new Set(asked)];
}

export interface AnyEventParams extends TriggerParams {
  /** Comma-separated Wise event types; empty = every event in `EVENT_BINDINGS`. */
  events?: string;
}

/** Build the Any Event trigger. `keys` is the public key pair; only a test passes another. */
export function anyEventTrigger(
  spec: { key: string; title: string; description: string },
  keys: PublicKeys = WISE_PUBLIC_KEYS,
): TriggerDefinition<AnyEventParams, WiseEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [ENVIRONMENT_PARAM, PROFILE_ID_PARAM, EVENTS_PARAM],
    output: EVENT_OUTPUT,
    sample: {
      eventType: "transfers#state-change",
      deliveryId: "5a1d3c70-2b8e-4a6f-9f0e-7c2d1e4b8a93",
      subscriptionId: "01234567-89ab-cdef-0123-456789abcdef",
      schemaVersion: "4.0.0",
      sentAt: "2026-11-09T10:12:50.123Z",
      data: {
        resource: { type: "transfer", id: 111, profile_id: 222, account_id: 333 },
        current_state: "outgoing_payment_sent",
        previous_state: "processing",
        occurred_at: "2026-11-09T10:12:50Z",
      },
    } satisfies WiseEvent,

    // Manual webhook: refuse an event list this trigger could not deliver, then hand back the URL.
    onSubscribe({ params, callbackUrl }) {
      chooseEvents(params?.events);
      return { callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params }) {
      const { event, eventType } = await verifyDelivery(raw, params, keys);
      const wanted = chooseEvents(params?.events);
      // An event type outside the list (or one we cannot bind to a profile) starts nothing.
      if (!wanted.includes(eventType) || !Object.hasOwn(EVENT_BINDINGS, eventType)) return [];
      bindProfile(params, event, EVENT_BINDINGS[eventType]);
      if (header(raw, "x-test-notification")?.toLowerCase() === "true") return [];
      return [toWiseEvent(raw, event, eventType)];
    },
  };
}

// ---------------------------------------------------------------------------------------------
// New Transfer: a since-filter poll (GET /transfers takes createdDateStart/End, no documented order).
// ---------------------------------------------------------------------------------------------

/** The clock the poll reads; a test replaces `now`. */
export const clock = { now: () => Date.now() };

/** Transfers per page, pages per check, and how far a window reaches back behind its cursor. */
export const TRANSFER_PAGE = 50;
export const TRANSFER_MAX_PAGES = 3;
export const TRANSFER_OVERLAP_MS = 120_000;
export const TRANSFER_SEEN_WINDOW = 600;

export interface NewTransferParams {
  profileId?: number;
}

export interface WiseTransfer {
  id: number;
  created?: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * The kit's ids envelope plus the window bookkeeping:
 * - `cursor`: ms the last fully drained window ended at,
 * - `floor`: ms of the seed; a transfer created before it is never emitted (section 9.9),
 * - `resume`: set while a window is only partly read — its bounds and the next offset (section 9.8).
 */
export interface TransferState {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  cursor: number;
  floor: number;
  resume?: { after: number; until: number; offset: number };
}

function readTransferState(state: unknown): TransferState | null {
  const s = state as Partial<TransferState> | null;
  if (
    !s || s.v !== 1 || s.kind !== "ids" || s.seeded !== true || !Array.isArray(s.ids) ||
    typeof s.cursor !== "number" || typeof s.floor !== "number"
  ) return null;
  return s as TransferState;
}

/** A transfer's own creation time in ms (`2017-11-24 10:47:49` is UTC), or null when unparseable. */
export function createdMs(t: { created?: unknown }): number | null {
  if (typeof t.created !== "string" || t.created === "") return null;
  const iso = /^\d{4}-\d{2}-\d{2} \d/.test(t.created)
    ? `${t.created.replace(" ", "T")}Z`
    : t.created;
  const ms = Date.parse(/(Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`);
  return Number.isFinite(ms) ? ms : null;
}

const isoSeconds = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");

/**
 * One check. Seed: remember `floor = cursor = now`, read nothing. Later checks list transfers
 * created in `[max(cursor - overlap, floor), until]` (until = now, fixed while a window is being
 * read, so a new transfer cannot shift the offsets), drop any created before the floor, and dedupe
 * by id. A window of more than TRANSFER_MAX_PAGES pages is read across checks (`resume.offset`);
 * the cursor only moves once it is drained.
 */
export async function checkTransfers(
  params: NewTransferParams,
  state: unknown,
  ctx: HookContext,
): Promise<{ events: WiseTransfer[]; nextState: TransferState }> {
  const now = clock.now();
  const prior = readTransferState(state);
  if (!prior) {
    return {
      events: [],
      nextState: { v: 1, kind: "ids", seeded: true, ids: [], cursor: now, floor: now },
    };
  }
  const window = prior.resume ?? {
    after: Math.max(prior.cursor - TRANSFER_OVERLAP_MS, prior.floor),
    until: now,
    offset: 0,
  };
  const seen = new Set(prior.ids);
  const queued = new Set<string>();
  const fresh: WiseTransfer[] = [];
  let offset = window.offset;
  let drained = false;
  for (let page = 0; page < TRANSFER_MAX_PAGES; page++) {
    const res = await transferList.execute({
      profile: params.profileId,
      createdDateStart: isoSeconds(window.after),
      createdDateEnd: isoSeconds(window.until),
      limit: TRANSFER_PAGE,
      offset,
    }, ctx) as { items?: WiseTransfer[] };
    const items = res.items ?? [];
    for (const t of items) {
      if (t?.id === undefined || t.id === null) continue;
      const id = String(t.id);
      const at = createdMs(t);
      if (at !== null && at < prior.floor) continue;
      if (seen.has(id) || queued.has(id)) continue;
      queued.add(id);
      fresh.push(t);
    }
    offset += items.length;
    if (items.length < TRANSFER_PAGE) {
      drained = true;
      break;
    }
  }
  // Oldest first (a transfer with no parseable time sorts by id).
  const events = fresh.sort((a, b) =>
    (createdMs(a) ?? 0) - (createdMs(b) ?? 0) || Number(a.id) - Number(b.id)
  );
  const ids = [...prior.ids, ...events.map((t) => String(t.id))].slice(-TRANSFER_SEEN_WINDOW);
  const nextState: TransferState = drained
    ? { v: 1, kind: "ids", seeded: true, ids, cursor: window.until, floor: prior.floor }
    : { ...prior, ids, resume: { after: window.after, until: window.until, offset } };
  return { events, nextState };
}
