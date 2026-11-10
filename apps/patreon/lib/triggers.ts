import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { PatreonClient } from "./client.ts";

/**
 * Patreon webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` registers one webhook on the campaign with `POST /webhooks` for ONE trigger
 *     (`members:pledge:create` or `posts:publish`). Patreon chooses the signing `secret` and
 *     returns it in that response (D5 (2)); it is kept in subscription state. A webhook without a
 *     secret is rolled back, never accepted unsigned.
 *   - `onUnsubscribe` deletes it; a 404/410 means it is already gone.
 *   - `handleIngest` verifies `X-Patreon-Signature` BEFORE it parses anything. Patreon's scheme is
 *     the HEX digest of the exact request body, HMAC-signed with MD5 under the webhook secret.
 *     MD5 is the vendor's choice and `crypto.subtle` has no MD5, so `hmacMd5Hex` below is a small
 *     self-contained RFC 1321 / RFC 2104 implementation, tested against `node:crypto`.
 *     Patreon sends no timestamp, so a captured delivery can be replayed; README says so.
 *
 * Docs (verified 2026-11-10): https://docs.patreon.com/#tag/Webhooks (Webhooks section and
 * "Triggers v2").
 */

export interface TriggerParams {
  campaignId: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  campaignId: string;
  webhookId: string;
  secret: string;
}

/** The run's `trigger.event`: one Patreon delivery. */
export interface PatreonEvent {
  trigger: string;
  resourceType: string | null;
  resourceId: string | null;
  campaignId: string | null;
  attributes: Record<string, unknown>;
  relationships: Record<string, unknown>;
  included: unknown[];
}

const CAMPAIGN_PARAM: Param = {
  key: "campaignId",
  label: "Campaign ID",
  type: "string",
  required: true,
  hint:
    "The campaign to watch: its id from List Campaigns. The connection needs the w:campaigns.webhook scope.",
};

const OUTPUT: OutputField[] = [
  { key: "trigger", type: "string", label: "Patreon Trigger" },
  { key: "resourceType", type: "string", label: "Resource Type" },
  { key: "resourceId", type: "string", label: "Resource ID" },
  { key: "campaignId", type: "string", label: "Campaign ID" },
  { key: "attributes", type: "object", label: "Attributes" },
  { key: "relationships", type: "object", label: "Relationships" },
  { key: "included", type: "array", label: "Included Resources" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

// ---- HMAC-MD5 (the one scheme Patreon documents) -------------------------------------------

const MD5_SHIFT = [
  7,
  12,
  17,
  22,
  7,
  12,
  17,
  22,
  7,
  12,
  17,
  22,
  7,
  12,
  17,
  22,
  5,
  9,
  14,
  20,
  5,
  9,
  14,
  20,
  5,
  9,
  14,
  20,
  5,
  9,
  14,
  20,
  4,
  11,
  16,
  23,
  4,
  11,
  16,
  23,
  4,
  11,
  16,
  23,
  4,
  11,
  16,
  23,
  6,
  10,
  15,
  21,
  6,
  10,
  15,
  21,
  6,
  10,
  15,
  21,
  6,
  10,
  15,
  21,
];
const MD5_K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32));

/** RFC 1321 MD5 of `data`. */
export function md5(data: Uint8Array): Uint8Array {
  const padded = new Uint8Array(((data.length + 8) >> 6 << 6) + 64);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, (data.length << 3) >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(data.length / 2 ** 29), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let off = 0; off < padded.length; off += 64) {
    let a = a0, b = b0, c = c0, d = d0;
    for (let i = 0; i < 64; i++) {
      let f: number, g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      f = (f + a + MD5_K[i] + view.getUint32(off + g * 4, true)) >>> 0;
      a = d;
      d = c;
      c = b;
      b = (b + ((f << MD5_SHIFT[i]) | (f >>> (32 - MD5_SHIFT[i])))) >>> 0;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }
  const out = new Uint8Array(16);
  const ov = new DataView(out.buffer);
  [a0, b0, c0, d0].forEach((w, i) => ov.setUint32(i * 4, w, true));
  return out;
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

/** RFC 2104 HMAC-MD5, lowercase hex. Both arguments must be non-empty. */
export function hmacMd5Hex(key: string, data: string): string {
  if (typeof key !== "string" || key === "") {
    throw new Error("HMAC key must be a non-empty string.");
  }
  if (typeof data !== "string" || data === "") {
    throw new Error("HMAC data must be a non-empty string.");
  }
  const enc = new TextEncoder();
  let k: Uint8Array = enc.encode(key);
  if (k.length > 64) k = md5(k);
  const ipad = new Uint8Array(64).fill(0x36);
  const opad = new Uint8Array(64).fill(0x5c);
  k.forEach((x, i) => {
    ipad[i] ^= x;
    opad[i] ^= x;
  });
  const m = enc.encode(data);
  const inner = new Uint8Array(64 + m.length);
  inner.set(ipad);
  inner.set(m, 64);
  const outer = new Uint8Array(64 + 16);
  outer.set(opad);
  outer.set(md5(inner), 64);
  return hex(md5(outer));
}

// ---- trigger -----------------------------------------------------------------------------------

/** Check `X-Patreon-Signature` against the exact bytes received. Returns the body. */
export function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
): string {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const given = header(raw, "x-patreon-signature");
  if (given === undefined || given === "") {
    throw new Error("Patreon delivery refused: the X-Patreon-Signature header is missing.");
  }
  if (!timingSafeEqual(hmacMd5Hex(key, body), given.toLowerCase())) {
    throw new Error("Patreon delivery refused: the signature does not match.");
  }
  return body;
}

/** The delivery body → its event. Throws on a body that is not a Patreon resource document. */
export function normalizeDelivery(body: unknown, trigger: string): PatreonEvent {
  const data = asObject(asObject(body)?.data);
  if (!data) throw new Error("Not a Patreon webhook delivery: expected `data`.");
  const rels = asObject(data.relationships) ?? {};
  const campaign = asObject(asObject(rels.campaign)?.data);
  const included = asObject(body)?.included;
  return {
    trigger,
    resourceType: str(data.type),
    resourceId: str(data.id),
    campaignId: str(campaign?.id),
    attributes: asObject(data.attributes) ?? {},
    relationships: rels,
    included: Array.isArray(included) ? included : [],
  };
}

const isGone = (err: unknown) =>
  err instanceof Error && (err as { status?: number }).status !== undefined &&
  [404, 410].includes((err as { status?: number }).status as number);

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The Patreon v2 trigger this subscription is registered for. */
  trigger: "members:pledge:create" | "posts:publish";
  sample: PatreonEvent;
}

/** Build one Patreon campaign webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, PatreonEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [CAMPAIGN_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const campaignId = params.campaignId?.trim();
      if (!campaignId) throw new Error("Choose the Patreon campaign to watch.");
      const client = new PatreonClient(ctx);
      const created = await client.request<
        { data?: { id?: string | number; attributes?: { secret?: unknown } } }
      >("/webhooks", {
        method: "POST",
        body: {
          type: "webhook",
          attributes: { triggers: [spec.trigger], uri: callbackUrl },
          relationships: { campaign: { data: { type: "campaign", id: campaignId } } },
        },
      });
      const id = created?.data?.id;
      const webhookId = id !== undefined && id !== null ? String(id) : "";
      if (!webhookId) throw new Error("Patreon did not return a webhook id.");
      const secret = created.data?.attributes?.secret;
      if (typeof secret !== "string" || secret === "") {
        try {
          await client.request(`/webhooks/${encodeURIComponent(webhookId)}`, { method: "DELETE" });
        } catch {
          // best effort: the subscription fails either way
        }
        throw new Error(
          "Patreon did not return a signing secret for the webhook; refusing to accept unsigned deliveries.",
        );
      }
      return { campaignId, webhookId, secret };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.webhookId) return;
      try {
        await new PatreonClient(ctx).request(`/webhooks/${encodeURIComponent(s.webhookId)}`, {
          method: "DELETE",
        });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    // deno-lint-ignore require-await
    async handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Patreon delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = verifySignature(raw, state?.secret);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Patreon delivery refused: the body is not JSON.");
      }
      const event = normalizeDelivery(parsed, header(raw, "x-patreon-event") ?? spec.trigger);
      // One webhook per subscription carries one trigger; anything else is acknowledged, no run.
      if (event.trigger !== spec.trigger) return [];
      if (state?.campaignId && event.campaignId && event.campaignId !== state.campaignId) return [];
      return [event];
    },
  };
}
