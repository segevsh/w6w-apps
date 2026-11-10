import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";
import { TikTokApiError, TikTokClient } from "./client.ts";

/**
 * TikTok Lead Generation webhook trigger (rfcs/trigger.md, webhook form).
 *
 * Source: https://business-api.tiktok.com/portal/docs/create-a-subscription/v1.3,
 * .../cancel-a-subscription/v1.3 and .../webhook-verification/v1.3 (all rendered in a headless
 * browser, verified 2026-11-10).
 *
 *   - `onSubscribe` POSTs `/subscription/subscribe/` with the developer app's `app_id` + `secret`,
 *     `subscribe_entity: "LEAD"`, the host's `callbackUrl`, and `subscription_detail`
 *     (`access_token`, `advertiser_id` or `library_id`, optional `page_id` / `lead_source`). The
 *     returned `subscription_id` is stored in state.
 *   - `onUnsubscribe` POSTs `/subscription/unsubscribe/`; a subscription TikTok no longer has counts
 *     as cancelled.
 *   - `handleIngest` verifies `TikTok-Signature: t=<unix seconds>,s=<hex>` — HMAC-SHA256 over
 *     `<t>.<raw body>` keyed with the developer app's secret — and only then parses the lead(s).
 *     The window is 300 s (the docs' sample uses 5 s). TikTok delivers at least once, so a lead
 *     can arrive twice; its `leadId` is the key to dedupe on.
 *
 * Lead and advertiser ids are 64-bit integers in the delivery; `JSON.parse` would round them, so
 * every `id` / `*_id` number of 16+ digits is quoted in the verified text before it is parsed.
 */

/** The window a signed timestamp may be away from now, in seconds. */
export const TOLERANCE_SECONDS = 300;

export interface TriggerParams {
  appId?: string;
  appSecret?: string;
  accessToken?: string;
  advertiserId?: string;
  libraryId?: string;
  pageId?: string;
  leadSource?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  subscriptionId: string;
}

export interface LeadEvent {
  leadId: string;
  leadSource: string | null;
  pageId: string | null;
  pageName: string | null;
  advertiserId: string | null;
  advertiserName: string | null;
  libraryId: string | null;
  campaignId: string | null;
  campaignName: string | null;
  adgroupId: string | null;
  adgroupName: string | null;
  adId: string | null;
  adName: string | null;
  /** Epoch seconds the lead was created. */
  createTime: number | null;
  /** The lead's answers, `field → value`. */
  fields: Record<string, unknown>;
  /** The same answers in delivery order. */
  changes: Array<{ field: string; value: unknown }>;
  /** Epoch seconds TikTok sent the notification. */
  sentAt: number | null;
}

const PARAMS: Param[] = [
  {
    key: "appId",
    label: "App ID",
    type: "string",
    required: true,
    hint: "Developer portal > My Apps > your app > App Detail > Basic Information > App ID.",
  },
  {
    key: "appSecret",
    label: "App Secret",
    type: "secret",
    required: true,
    hint:
      "Same page > Secret. TikTok signs every lead delivery with it; deliveries that do not verify are refused.",
  },
  {
    key: "accessToken",
    label: "Access Token",
    type: "secret",
    required: true,
    hint:
      "The long-lived access token of the account that authorized the app (the one in the connection). TikTok stops sending when it is revoked.",
  },
  {
    key: "advertiserId",
    label: "Advertiser ID",
    type: "string",
    hint: "Lead ads of this ad account (you need Admin access). Give this or a Form Library ID.",
  },
  {
    key: "libraryId",
    label: "Form Library ID",
    type: "string",
    hint: "Lead ads using a form library in a Business Center. Give this or an Advertiser ID.",
  },
  {
    key: "pageId",
    label: "Instant Form (Page) ID",
    type: "string",
    hint: "Only this Instant Form. Blank = every form. Not supported for direct-message leads.",
  },
  {
    key: "leadSource",
    label: "Lead source",
    type: "select",
    options: [
      { value: "INSTANT_FORM", label: "Instant Form" },
      { value: "DIRECT_MESSAGE", label: "Direct message" },
    ],
    hint: "Blank = Instant Form leads.",
  },
];

const OUTPUT: OutputField[] = [
  { key: "leadId", type: "string", label: "Lead ID" },
  { key: "leadSource", type: "string", label: "Lead Source" },
  { key: "pageId", type: "string", label: "Page ID" },
  { key: "pageName", type: "string", label: "Page Name" },
  { key: "advertiserId", type: "string", label: "Advertiser ID" },
  { key: "advertiserName", type: "string", label: "Advertiser Name" },
  { key: "libraryId", type: "string", label: "Library ID" },
  { key: "campaignId", type: "string", label: "Campaign ID" },
  { key: "campaignName", type: "string", label: "Campaign Name" },
  { key: "adgroupId", type: "string", label: "Ad Group ID" },
  { key: "adgroupName", type: "string", label: "Ad Group Name" },
  { key: "adId", type: "string", label: "Ad ID" },
  { key: "adName", type: "string", label: "Ad Name" },
  { key: "createTime", type: "number", label: "Created (epoch seconds)" },
  { key: "fields", type: "object", label: "Answers (field → value)" },
  { key: "changes", type: "array", label: "Answers (in order)" },
  { key: "sentAt", type: "number", label: "Sent (epoch seconds)" },
];

const SAMPLE: LeadEvent = {
  leadId: "7000000000000000001",
  leadSource: "INSTANT_FORM",
  pageId: "7000000000000000002",
  pageName: "Spring signup form",
  advertiserId: "7000000000000000003",
  advertiserName: "Example Advertiser",
  libraryId: "0",
  campaignId: "7000000000000000004",
  campaignName: "Spring campaign",
  adgroupId: "7000000000000000005",
  adgroupName: "Ad group 1",
  adId: "7000000000000000006",
  adName: "Ad 1",
  createTime: 1614239152,
  fields: { name: "Jane Doe", email: "jane@example.com", phone_number: "15550100" },
  changes: [
    { field: "name", value: "Jane Doe" },
    { field: "email", value: "jane@example.com" },
    { field: "phone_number", value: "15550100" },
  ],
  sentAt: 1614334356,
};

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Parse `TikTok-Signature: t=<unix seconds>,s=<hex>`. Exactly one of each, or it throws. */
export function parseSignatureHeader(value: string | undefined): { t: number; s: string } {
  if (value === undefined || value.trim() === "") {
    throw new Error("TikTok delivery refused: the TikTok-Signature header is missing.");
  }
  let t: string | undefined;
  let s: string | undefined;
  for (const part of value.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k === "t") {
      if (t !== undefined) t = "";
      else t = v;
    } else if (k === "s") {
      if (s !== undefined) s = "";
      else s = v;
    }
  }
  if (!t || !/^\d{1,12}$/.test(t) || !s || !/^[0-9a-fA-F]+$/.test(s)) {
    throw new Error("TikTok delivery refused: the TikTok-Signature header is malformed.");
  }
  return { t: Number(t), s: s.toLowerCase() };
}

/**
 * Verify the delivery against the developer app's secret and return the exact text signed.
 * Order: secret configured → raw body present → header parsed → HMAC compared in constant time →
 * timestamp inside the window. Throws on any failure and echoes no secret, signature or header.
 */
export async function verifyDelivery(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  appSecret: unknown,
  nowMs: number = Date.now(),
): Promise<string> {
  const secret = requireSecret(appSecret);
  const body = requireRawBody(raw);
  const { t, s } = parseSignatureHeader(header(raw, "tiktok-signature"));
  const expected = await hmac("SHA-256", secret, `${t}.${body}`, "hex");
  if (!timingSafeEqual(expected, s)) {
    throw new Error("TikTok delivery refused: the signature does not match.");
  }
  if (!withinTolerance(t, nowMs, TOLERANCE_SECONDS)) {
    throw new Error(
      `TikTok delivery refused: the signed timestamp is more than ${TOLERANCE_SECONDS} seconds from now.`,
    );
  }
  return body;
}

/** Quote 16+ digit `id` / `*_id` numbers so `JSON.parse` keeps them exact. */
function parseExact(text: string): unknown {
  return JSON.parse(
    text.replace(/(?<!\\)("(?:id|[a-z_]*_id)"\s*:\s*)(\d{16,})(?=\s*[,}\]])/g, '$1"$2"'),
  );
}

/** A verified delivery body → one event per lead entry (none for another `object` type). */
export function normalizeDelivery(body: string): LeadEvent[] {
  let doc: Record<string, unknown> | null;
  try {
    doc = asObject(parseExact(body));
  } catch {
    doc = null;
  }
  if (!doc) throw new Error("TikTok delivery is not a JSON object.");
  if (doc.object !== 1) return [];
  if (!Array.isArray(doc.entry)) throw new Error("TikTok lead delivery has no `entry` list.");
  return doc.entry.map((e): LeadEvent => {
    const entry = asObject(e);
    const leadId = str(entry?.id);
    if (!entry || !leadId) throw new Error("TikTok lead delivery has an entry without an id.");
    const changes: LeadEvent["changes"] = [];
    const fields: Record<string, unknown> = {};
    for (const c of Array.isArray(entry.changes) ? entry.changes : []) {
      const ch = asObject(c);
      if (!ch || typeof ch.field !== "string") continue;
      changes.push({ field: ch.field, value: ch.value });
      fields[ch.field] = ch.value;
    }
    return {
      leadId,
      leadSource: str(entry.lead_source),
      pageId: str(entry.page_id),
      pageName: str(entry.page_name),
      advertiserId: str(entry.advertiser_id),
      advertiserName: str(entry.advertiser_name),
      libraryId: str(entry.library_id),
      campaignId: str(entry.campaign_id),
      campaignName: str(entry.campaign_name),
      adgroupId: str(entry.adgroup_id),
      adgroupName: str(entry.adgroup_name),
      adId: str(entry.ad_id),
      adName: str(entry.ad_name),
      createTime: num(entry.create_time),
      fields,
      changes,
      sentAt: num(doc.time),
    };
  });
}

function need(v: unknown, label: string): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) throw new Error(`TikTok Lead Generation trigger needs ${label}.`);
  return s;
}

/** A 404/410, or TikTok saying the subscription is not there, means it is already cancelled. */
function isGone(err: unknown): boolean {
  if (err instanceof TikTokApiError) {
    return err.status === 404 || err.status === 410 ||
      /not\s+found|does\s+not\s+exist/i.test(err.message);
  }
  return err instanceof Error && /\(HTTP (404|410)\)/.test(err.message);
}

/** The `new-lead` trigger. */
export const newLead: TriggerDefinition<TriggerParams, LeadEvent, TriggerState> = {
  key: "new-lead",
  title: "New Lead",
  description:
    "Fires when TikTok collects a new Instant Form or direct-message lead. The run gets the lead's id, its source, the ad account, campaign, ad group and ad it came from, and the answers it submitted.",
  params: PARAMS,
  output: OUTPUT,
  sample: SAMPLE,

  async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
    const appId = need(params.appId, "the App ID");
    const secret = requireSecret(params.appSecret);
    const accessToken = need(params.accessToken, "the Access Token");
    const advertiserId = params.advertiserId?.trim();
    const libraryId = params.libraryId?.trim();
    if (!advertiserId && !libraryId) {
      throw new Error(
        "TikTok Lead Generation trigger needs an Advertiser ID or a Form Library ID.",
      );
    }
    const detail: Record<string, unknown> = { access_token: accessToken };
    if (advertiserId) detail.advertiser_id = advertiserId;
    else detail.library_id = libraryId;
    if (params.pageId?.trim()) detail.page_id = params.pageId.trim();
    if (params.leadSource?.trim()) detail.lead_source = params.leadSource.trim();

    const data = await new TikTokClient(ctx).request<{ subscription_id?: unknown }>(
      "/subscription/subscribe/",
      {
        method: "POST",
        body: {
          app_id: appId,
          secret,
          subscribe_entity: "LEAD",
          callback_url: callbackUrl,
          subscription_detail: detail,
        },
      },
    );
    const id = str(data?.subscription_id);
    if (!id) throw new Error("TikTok created the subscription but returned no subscription_id.");
    return { subscriptionId: id };
  },

  async onUnsubscribe({ params, state }, ctx: HookContext) {
    const id = (state as Partial<TriggerState> | undefined)?.subscriptionId;
    if (!id) return;
    try {
      await new TikTokClient(ctx).request("/subscription/unsubscribe/", {
        method: "POST",
        body: {
          app_id: need(params.appId, "the App ID"),
          secret: requireSecret(params.appSecret),
          subscription_id: id,
        },
      });
    } catch (err) {
      if (!isGone(err)) throw err;
    }
  },

  async handleIngest({ raw, params }) {
    if (raw.method.toUpperCase() !== "POST") {
      throw new Error(`TikTok delivers leads with POST, not ${raw.method}.`);
    }
    const body = await verifyDelivery(raw, params?.appSecret);
    return normalizeDelivery(body);
  },
};
