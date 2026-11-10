import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";
import { MailchimpClient } from "./client.ts";

/**
 * Mailchimp audience webhook triggers (rfcs/trigger.md, webhook-api form). Vendor docs, verified
 * 2026-11-10: https://mailchimp.com/developer/marketing/guides/sync-audience-data-webhooks/ and
 * https://mailchimp.com/developer/marketing/api/list-webhooks/add-webhook/
 *
 *   - `onSubscribe` creates a webhook on the chosen audience (`POST /lists/{list_id}/webhooks`)
 *     pointed at the host's `callbackUrl`, after deleting any webhook on that audience already
 *     pointed there (the URL is unique to the subscription, so one carrying it is a leftover whose
 *     signing secret is lost: Mailchimp returns `signing_secret` only at creation). The secret is
 *     kept in the subscription state (D5 (1)); a webhook created without one is deleted again.
 *   - `onUnsubscribe` deletes the webhook; one Mailchimp no longer has counts as deleted.
 *   - `handleIngest` verifies `X-Mailchimp-Signature` (`t=<unix seconds>,v1=<hex>`, HMAC-SHA256 of
 *     `<t>.<raw body>` under the signing secret) over the raw bytes, within the documented
 *     5-minute window, BEFORE parsing the form-encoded body. A delivery that does not verify throws.
 */

/** Mailchimp's documented tolerance between the signed timestamp and now. */
export const TOLERANCE_SEC = 300;

/** The six audience events; the SMS betas are also accepted by the Any Event trigger. */
export const CORE_EVENTS = [
  "subscribe",
  "unsubscribe",
  "profile",
  "cleaned",
  "upemail",
  "campaign",
];
export const SMS_EVENTS = ["sms_subscribe", "sms_unsubscribe", "upsms", "sms_campaign"];
const KNOWN_EVENTS = [...CORE_EVENTS, ...SMS_EVENTS];

export interface TriggerParams {
  listId: string;
  /** Any Event only: comma-separated Mailchimp event names, empty = the six audience events. */
  events?: string;
  /** Also fire for changes made through the API (including this workflow's own actions). */
  apiChanges?: boolean;
}

export interface TriggerState {
  webhookId: string;
  listId: string;
  /** The webhook's signing secret, returned by Mailchimp once, at creation. */
  secret: string;
  events: string[];
}

/** The run's `trigger.event`: the delivery, with the audience and member lifted out of `data`. */
export interface MailchimpEvent {
  type: string;
  firedAt: string | null;
  listId: string | null;
  id: string | null;
  email: string | null;
  data: Record<string, unknown>;
}

const LIST_PARAM: Param = {
  key: "listId",
  label: "Audience",
  type: "string",
  required: true,
  hint: "The audience (list) ID: Audience, Settings, Audience name and defaults.",
};

const API_PARAM: Param = {
  key: "apiChanges",
  label: "Include API changes",
  type: "boolean",
  default: false,
  hint:
    "Also fire for changes made through the API, including this workflow's own Create/Update Member actions (off by default so a workflow cannot trigger itself).",
};

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  placeholder: "subscribe, unsubscribe",
  hint:
    "Comma-separated Mailchimp events: subscribe, unsubscribe, profile, cleaned, upemail, campaign (SMS betas: sms_subscribe, sms_unsubscribe, upsms, sms_campaign). Leave empty for the six audience events.",
};

const EVENT_OUTPUT: OutputField[] = [
  { key: "type", type: "string", label: "Event type" },
  { key: "firedAt", type: "string", label: "Fired at" },
  { key: "listId", type: "string", label: "Audience ID" },
  { key: "id", type: "string", label: "Member or campaign ID" },
  { key: "email", type: "string", label: "Email address" },
  { key: "data", type: "object", label: "Event data" },
];

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

/** Split the Any Event trigger's comma-separated list; an unknown name is refused. */
export function parseEventList(raw: unknown): string[] {
  const names = typeof raw === "string"
    ? [...new Set(raw.split(",").map((s) => s.trim()).filter((s) => s !== ""))]
    : [];
  for (const name of names) {
    if (!KNOWN_EVENTS.includes(name)) throw new Error(`Unknown Mailchimp event "${name}".`);
  }
  return names;
}

/** `X-Mailchimp-Signature: t=<seconds>,v1=<hex>` -> its parts, or null when malformed. */
export function parseSignatureHeader(value: string): { t: string; v1: string } | null {
  let t: string | null = null;
  let v1: string | null = null;
  for (const part of value.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key === "t" && /^\d{1,15}$/.test(val)) t = val;
    else if (key === "v1" && /^[0-9a-fA-F]{64}$/.test(val)) v1 = val.toLowerCase();
  }
  return t !== null && v1 !== null ? { t, v1 } : null;
}

/**
 * Parse Mailchimp's form body (`data[merges][EMAIL]=...`) into nested objects. Keys that could
 * reach an object's prototype are dropped.
 */
export function parseForm(body: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const [name, value] of new URLSearchParams(body).entries()) {
    const m = /^([^[\]]+)((?:\[[^[\]]*\])*)$/.exec(name);
    if (!m) continue;
    const path = [m[1], ...[...m[2].matchAll(/\[([^[\]]*)\]/g)].map((x) => x[1])];
    if (path.some((p) => p === "__proto__" || p === "constructor" || p === "prototype")) continue;
    let node = root;
    for (let i = 0; i < path.length - 1; i++) {
      const next = Object.hasOwn(node, path[i]) ? node[path[i]] : undefined;
      if (next === null || typeof next !== "object") node[path[i]] = {};
      node = node[path[i]] as Record<string, unknown>;
    }
    node[path[path.length - 1]] = value;
  }
  return root;
}

/**
 * Verify one delivery and return its parsed form. Throws, saying nothing about the secret, the
 * signature or the header value, unless the signature over the raw body checks out in time.
 */
async function verifiedForm(
  raw: { method: string; rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
): Promise<Record<string, unknown>> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  if (raw.method.toUpperCase() !== "POST") {
    throw new Error("Mailchimp delivers webhooks with POST only.");
  }
  const given = header(raw, "x-mailchimp-signature");
  if (given === undefined || given === "") {
    throw new Error("Mailchimp delivery refused: the X-Mailchimp-Signature header is missing.");
  }
  const parsed = parseSignatureHeader(given);
  if (!parsed) {
    throw new Error("Mailchimp delivery refused: the signature header is not in t=,v1= form.");
  }
  const expected = await hmac("SHA-256", key, `${parsed.t}.${body}`, "hex");
  if (!timingSafeEqual(expected, parsed.v1)) {
    throw new Error("Mailchimp delivery refused: the signature does not match.");
  }
  if (!withinTolerance(Number(parsed.t), Date.now(), TOLERANCE_SEC)) {
    throw new Error("Mailchimp delivery refused: the signed timestamp is outside the tolerance.");
  }
  return parseForm(body);
}

/** The parsed delivery -> the run's `trigger.event`. */
export function normalizeEvent(form: Record<string, unknown>): MailchimpEvent {
  const data = form.data !== null && typeof form.data === "object"
    ? form.data as Record<string, unknown>
    : {};
  return {
    type: String(form.type ?? ""),
    firedAt: str(form.fired_at),
    listId: str(data.list_id),
    id: str(data.id),
    email: str(data.email),
    data,
  };
}

/** Delete one webhook. One Mailchimp no longer has is already what we wanted. */
async function deleteWebhook(client: MailchimpClient, listId: string, id: string): Promise<void> {
  try {
    await client.request(
      `/lists/${encodeURIComponent(listId)}/webhooks/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  } catch (err) {
    if (err instanceof Error && /^Mailchimp (404|410) /.test(err.message)) return;
    throw err;
  }
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The Mailchimp event this trigger fires on; omitted for Any Event (its `events` param). */
  event?: string;
  /** A representative `data` object for the sample. */
  sampleData?: Record<string, unknown>;
}

/** Build one Mailchimp webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, MailchimpEvent, TriggerState> {
  const fixed = spec.event;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: fixed ? [LIST_PARAM, API_PARAM] : [LIST_PARAM, EVENTS_PARAM, API_PARAM],
    output: EVENT_OUTPUT,
    sample: {
      type: fixed ?? "subscribe",
      firedAt: "2026-11-09 21:35:57",
      listId: "a6b5da1054",
      id: "8a25ff1d98",
      email: "ada@example.com",
      data: spec.sampleData ?? {
        id: "8a25ff1d98",
        list_id: "a6b5da1054",
        email: "ada@example.com",
        email_type: "html",
      },
    } satisfies MailchimpEvent,

    async onSubscribe({ params, callbackUrl }, ctx) {
      const listId = str(params.listId);
      if (!listId) throw new Error("Choose the audience to watch.");
      const events = fixed ? [fixed] : (() => {
        const named = parseEventList(params.events);
        return named.length > 0 ? named : CORE_EVENTS;
      })();
      const client = new MailchimpClient(ctx);
      const base = `/lists/${encodeURIComponent(listId)}/webhooks`;
      const existing = await client.request<{ webhooks?: Array<{ id?: unknown; url?: unknown }> }>(
        base,
        { query: { count: 1000 } },
      );
      for (const hook of existing?.webhooks ?? []) {
        const id = str(hook.id);
        if (id && hook.url === callbackUrl) await deleteWebhook(client, listId, id);
      }
      const created = await client.request<{ id?: unknown; signing_secret?: unknown }>(base, {
        method: "POST",
        body: {
          url: callbackUrl,
          events: Object.fromEntries(events.map((e) => [e, true])),
          sources: { user: true, admin: true, api: params.apiChanges === true },
        },
      });
      const webhookId = str(created?.id);
      const secret = str(created?.signing_secret);
      if (!webhookId) throw new Error("Mailchimp created the webhook but returned no id.");
      if (!secret) {
        // Without the secret no delivery can ever be verified: do not leave the webhook behind.
        await deleteWebhook(client, listId, webhookId);
        throw new Error("Mailchimp created the webhook but returned no signing secret.");
      }
      return { webhookId, listId, secret, events };
    },

    async onUnsubscribe({ state }, ctx) {
      const s = state as Partial<TriggerState> | undefined;
      const webhookId = str(s?.webhookId);
      const listId = str(s?.listId);
      if (webhookId && listId) await deleteWebhook(new MailchimpClient(ctx), listId, webhookId);
    },

    async handleIngest({ raw, state }) {
      const event = normalizeEvent(await verifiedForm(raw, state?.secret));
      const wanted = state?.events ?? [];
      if (event.type === "" || (wanted.length > 0 && !wanted.includes(event.type))) return [];
      return [event];
    },
  };
}
