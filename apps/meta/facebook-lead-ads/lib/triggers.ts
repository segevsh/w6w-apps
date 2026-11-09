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
