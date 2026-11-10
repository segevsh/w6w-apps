/**
 * facebook-lead-ads webhook triggers (manual webhook). Meta signs every delivery with the app secret
 * (X-Hub-Signature-256 = sha256 HMAC over the exact body bytes) and confirms a subscription with a
 * one-time GET carrying hub.verify_token and hub.challenge. Docs, verified 2026-11-09:
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */
import type {
  IngestResponse,
  OutputField,
  Param,
  TriggerCall,
  TriggerDefinition,
} from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { pollNewItems } from "../../_shared/poll/mod.ts";

/** What `onSubscribe` returns and the host persists: Meta is registered by hand in the dashboard. */
export interface TriggerState {
  callbackUrl: string;
}

export interface MetaParams {
  /** The Meta app's App Secret — signs every delivery. */
  appSecret?: string;
  /** The verify token the user typed into the dashboard — answers the one-time GET handshake. */
  verifyToken?: string;
}

export const APP_SECRET_PARAM: Param = {
  key: "appSecret",
  label: "App Secret",
  type: "secret",
  required: true,
  hint:
    "Meta app dashboard → App settings → Basic → App Secret. Every delivery is verified against it; deliveries that do not match are refused.",
};

export const VERIFY_TOKEN_PARAM: Param = {
  key: "verifyToken",
  label: "Verify Token",
  type: "secret",
  required: true,
  hint:
    "Any string you choose. Enter the same value in the webhook's Verify Token field in the Meta dashboard; it answers Meta's one-time subscription check.",
};

export const META_PARAMS: Param[] = [APP_SECRET_PARAM, VERIFY_TOKEN_PARAM];

/** A Meta challenge is a number; accept only a short token of URL-safe characters. */
const CHALLENGE = /^[A-Za-z0-9_-]{1,256}$/;

/**
 * Meta's subscription handshake: `GET ?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…`
 * must be answered with the challenge, and only when the verify token is the one we hold.
 */
function answerChallenge(
  raw: TriggerCall,
  params: MetaParams,
): { events: never[]; response: IngestResponse } {
  const expected = requireSecret(params.verifyToken);
  const q = raw.query ?? {};
  if ((q["hub.mode"] ?? q["hub_mode"]) !== "subscribe") {
    throw new Error("Meta webhook GET refused: not a subscription check.");
  }
  const given = q["hub.verify_token"] ?? q["hub_verify_token"];
  if (!timingSafeEqual(typeof given === "string" ? given : "", expected)) {
    throw new Error("Meta webhook verification refused: the verify token does not match.");
  }
  const challenge = q["hub.challenge"] ?? q["hub_challenge"];
  if (typeof challenge !== "string" || !CHALLENGE.test(challenge)) {
    throw new Error("Meta webhook verification refused: the challenge is missing or malformed.");
  }
  return { events: [], response: { body: challenge } };
}

/** `X-Hub-Signature-256: sha256=<hex HMAC-SHA256(app secret, exact body bytes)>`. */
async function verifySignature(raw: TriggerCall, params: MetaParams): Promise<string> {
  const secret = requireSecret(params.appSecret);
  const body = requireRawBody(raw);
  const given = header(raw, "x-hub-signature-256");
  if (typeof given !== "string" || !given.startsWith("sha256=")) {
    throw new Error("Meta webhook refused: the X-Hub-Signature-256 header is missing.");
  }
  const expected = "sha256=" + await hmac("SHA-256", secret, body, "hex");
  if (!timingSafeEqual(given.toLowerCase(), expected)) {
    throw new Error("Meta webhook refused: the signature does not match.");
  }
  return body;
}

export interface MetaEntry {
  id?: string;
  time?: number;
  changes?: Array<{ field?: string; value?: Record<string, unknown> }>;
}

export interface MetaPayload {
  object?: string;
  entry?: MetaEntry[];
}

/**
 * Shared ingest: answer the GET handshake, or verify the signature over the raw body and hand the
 * parsed payload to `extract`. Verification happens before the body is parsed.
 */
export async function ingestMeta<E>(
  raw: TriggerCall,
  params: MetaParams,
  extract: (payload: MetaPayload) => E[],
): Promise<E[] | { events: E[]; response: IngestResponse }> {
  const method = String(raw.method ?? "").toUpperCase();
  if (method === "GET") return answerChallenge(raw, params);
  if (method !== "POST") throw new Error(`Meta delivers webhooks with POST, not ${raw.method}.`);
  const body = await verifySignature(raw, params);
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error("Meta webhook refused: the body is not JSON.");
  }
  if (payload === null || typeof payload !== "object") return [];
  return extract(payload as MetaPayload);
}

export function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

export function obj(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

/** The stored and run event: one lead submitted through a Lead Ads form. */
export interface LeadEvent {
  leadgenId: string;
  pageId: string | null;
  formId: string | null;
  adId: string | null;
  adgroupId: string | null;
  createdTime: number | null;
}

const OUTPUT: OutputField[] = [
  { key: "leadgenId", type: "string", label: "Lead ID" },
  { key: "pageId", type: "string", label: "Page ID" },
  { key: "formId", type: "string", label: "Form ID" },
  { key: "adId", type: "string", label: "Ad ID" },
  { key: "adgroupId", type: "string", label: "Ad Set ID" },
  { key: "createdTime", type: "number", label: "Created Time (epoch seconds)" },
];

const SAMPLE: LeadEvent = {
  leadgenId: "444444444444",
  pageId: "104059235640000",
  formId: "222222222222",
  adId: "6100000000000",
  adgroupId: "6200000000000",
  createdTime: 1731139200,
};

/** Every `leadgen` change in a verified Page delivery. */
export function leadEvents(payload: MetaPayload): LeadEvent[] {
  if (payload.object !== "page" || !Array.isArray(payload.entry)) return [];
  const out: LeadEvent[] = [];
  for (const entry of payload.entry) {
    for (const change of entry?.changes ?? []) {
      if (change?.field !== "leadgen") continue;
      const v = obj(change.value) ?? {};
      const leadgenId = str(v.leadgen_id);
      if (!leadgenId) continue;
      out.push({
        leadgenId,
        pageId: str(v.page_id ?? entry.id),
        formId: str(v.form_id),
        adId: str(v.ad_id),
        adgroupId: str(v.adgroup_id),
        createdTime: typeof v.created_time === "number" ? v.created_time : null,
      });
    }
  }
  return out;
}

/** New Lead Ads submission (manual webhook, signed with the App Secret). */
export const newLeadTrigger: TriggerDefinition<MetaParams, LeadEvent, TriggerState> = {
  key: "new-lead",
  title: "New Lead",
  description:
    "Fires when someone submits a Facebook Lead Ads form on a Page. The run gets the lead ID with its form, ad and Page IDs; fetch the answers with List Recent Leads.",
  params: META_PARAMS,
  output: OUTPUT,
  sample: SAMPLE,
  onSubscribe({ callbackUrl }) {
    return { callbackUrl };
  },
  onUnsubscribe() {},
  handleIngest({ raw, params }) {
    return ingestMeta(raw, params, leadEvents);
  },
};

type PollCtx = Parameters<NonNullable<TriggerDefinition["poll"]>>[1];

/** Overridable in tests so a check runs at a fixed instant. */
export const clock = { now: (): number => Date.now() };

/** Each check re-reads this much history, so a record stamped late is still picked up. */
export const OVERLAP_MS = 120_000;
const MAX_EVENTS = 100;
/** Ids remembered across checks; must cover one read (pages x page size) plus held re-reads. */
const SEEN_WINDOW = 1000;

/** One bounded read of a window: its items, and `next` (opaque resume position) while more remain. */
export interface SinceBatch {
  items: unknown[];
  next?: string;
}

export interface SinceSpec<P> {
  key: string;
  title: string;
  description: string;
  params?: TriggerDefinition["params"];
  output: NonNullable<TriggerDefinition["output"]>;
  sample: unknown;
  /**
   * Runs the wrapped list action with its created-after filter set to `since` (ISO 8601), starting
   * at `at` (the `next` the previous batch returned; undefined at the window's start). It reads at
   * most a few pages per call and returns `next` when the window holds more (brief §9.8).
   */
  load(since: string, params: P, ctx: PollCtx, at?: string): Promise<SinceBatch>;
  idOf(item: unknown): string;
  /** The item's creation time in epoch ms (used to put the page newest-first). */
  stampOf(item: unknown): number;
}

/**
 * Since-filter poll (brief §9.1 b): the wrapped list action is called with its created-after
 * filter at `cursor - overlap`; ids dedupe the overlap. The first check reads nothing: it stores
 * `floor = now`, and every later check drops items created before `floor` (brief §9.9), so no
 * record that predates the seed can ever be emitted, however many pages the overlap window holds.
 * A window wider than one check's pages is walked across checks from a persisted position
 * (brief §9.8); its `since` stays fixed and the cursor moves only once the window is drained.
 */
export function sinceTrigger<P = Record<string, unknown>>(spec: SinceSpec<P>): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params ?? [],
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const checkedAt = clock.now();
      const prior = state as { cursor?: unknown; floor?: unknown; resume?: unknown };
      if (typeof prior.cursor !== "number" || typeof prior.floor !== "number") {
        // Seed (§9.9): read nothing, remember the instant. Pre-seed records are dropped by `floor`.
        const seeded = await pollNewItems({
          state,
          maxPages: 1,
          maxEvents: MAX_EVENTS,
          seenWindow: SEEN_WINDOW,
          idOf: spec.idOf,
          fetchPage: () => Promise.resolve({ items: [] }),
        });
        return {
          ...seeded,
          nextState: { ...seeded.nextState, cursor: checkedAt, floor: checkedAt },
        };
      }
      const { cursor, floor } = prior as { cursor: number; floor: number };
      const r = prior.resume as { since?: unknown; at?: unknown } | undefined;
      const resume = r && typeof r.since === "string" && typeof r.at === "string"
        ? { since: r.since, at: r.at }
        : undefined;
      const since = resume?.since ?? new Date(cursor - OVERLAP_MS).toISOString();
      const batch = await spec.load(since, params as P, ctx, resume?.at);
      const items = batch.items
        .filter((item) => {
          const stamp = spec.stampOf(item);
          return !(stamp > 0 && stamp < floor);
        })
        .map((item, index) => ({ item, index }))
        .sort((a, b) => spec.stampOf(b.item) - spec.stampOf(a.item) || a.index - b.index)
        .map((entry) => entry.item);
      const polled = await pollNewItems({
        state,
        maxPages: 1,
        maxEvents: MAX_EVENTS,
        seenWindow: SEEN_WINDOW,
        idOf: spec.idOf,
        fetchPage: () => Promise.resolve({ items }),
      });
      const seen = new Set(
        Array.isArray((state as { ids?: unknown }).ids)
          ? (state as { ids: unknown[] }).ids.map(String)
          : [],
      );
      const unseen = new Set(items.map((item) => spec.idOf(item)).filter((id) => !seen.has(id)));
      const held = unseen.size > polled.events.length;
      let tail: { cursor: number; floor: number; resume?: { since: string; at: string } };
      if (held) {
        // Unemitted items remain in this read: re-read the same position next check.
        tail = { cursor, floor, ...(resume ? { resume } : {}) };
      } else if (batch.next !== undefined) {
        tail = { cursor, floor, resume: { since, at: batch.next } };
      } else {
        tail = { cursor: checkedAt, floor };
      }
      return { ...polled, nextState: { ...polled.nextState, ...tail } };
    },
  };
}
