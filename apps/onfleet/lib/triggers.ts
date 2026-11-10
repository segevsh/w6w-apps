import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { OnfleetClient } from "./client.ts";

/**
 * Onfleet webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` deletes any webhook already pointed at the host's `callbackUrl` (a leftover
 *     of an attempt that never recorded its id), then `POST /webhooks` with the chosen trigger id.
 *     Onfleet validates the URL BEFORE registering it: it sends `GET <url>?check=<random>` and
 *     wants the string back with HTTP 200 (204 is refused). That GET reaches `handleIngest`.
 *   - `onUnsubscribe` deletes the webhook; one Onfleet no longer has counts as deleted.
 *   - `handleIngest` verifies `X-Onfleet-Signature` — the lowercase-hex HMAC-SHA512 of the raw
 *     request body, keyed by the bytes of the organization's hex webhook secret — before it parses
 *     anything. The secret is the account-wide one from the Onfleet dashboard (Configuration →
 *     API & Webhook → Show Secret), so the user pastes it as the `signingSecret` parameter.
 *
 * The kit's `hmac` helper covers SHA-256/SHA-1 only; SHA-512 uses `crypto.subtle` here directly.
 */

/** Onfleet trigger ids this app registers for (docs.onfleet.com/reference/webhooks). */
export type OnfleetTriggerId = 0 | 3 | 4 | 6 | 7 | 9;

export interface TriggerParams {
  signingSecret?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  trigger: OnfleetTriggerId;
}

/** One delivery, normalized. */
export interface OnfleetEvent {
  triggerId: number;
  triggerName: string | null;
  time: number | null;
  taskId: string | null;
  workerId: string | null;
  adminId: string | null;
  task: Record<string, unknown> | null;
  worker: Record<string, unknown> | null;
}

const SIGNING_SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "Webhook secret",
  type: "secret",
  required: true,
  hint:
    "Onfleet dashboard → Configuration → API & Webhook → Show Secret (a hexadecimal string). Used to verify every delivery.",
};

export const EVENT_OUTPUT: OutputField[] = [
  { key: "triggerId", type: "number", label: "Trigger ID" },
  { key: "triggerName", type: "string", label: "Trigger name" },
  { key: "time", type: "number", label: "Time (Unix ms)" },
  { key: "taskId", type: "string", label: "Task ID" },
  { key: "workerId", type: "string", label: "Worker ID" },
  { key: "adminId", type: "string", label: "Admin ID" },
  { key: "task", type: "object", label: "Task" },
  { key: "worker", type: "object", label: "Worker" },
];

const CHECK_PATTERN = /^[\x21-\x7e]{1,256}$/;

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

/** The webhook secret's bytes. Throws (naming nothing) unless it is non-empty even-length hex. */
function secretBytes(secret: string): Uint8Array<ArrayBuffer> {
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(secret)) {
    throw new Error("The Onfleet webhook secret must be a hexadecimal string.");
  }
  const out = new Uint8Array(new ArrayBuffer(secret.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(secret.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function hmacSha512Hex(key: Uint8Array<ArrayBuffer>, data: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-512" }, false, [
    "sign",
  ]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data)));
  let out = "";
  for (const b of sig) out += b.toString(16).padStart(2, "0");
  return out;
}

async function deleteWebhook(client: OnfleetClient, id: string): Promise<void> {
  try {
    await client.request(`/webhooks/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (err) {
    if (/Onfleet (404|410) /.test(String((err as Error)?.message))) return;
    throw err;
  }
}

async function leftovers(client: OnfleetClient, callbackUrl: string): Promise<string[]> {
  const listed = await client.request<Array<{ id?: unknown; url?: unknown }>>("/webhooks");
  return (Array.isArray(listed) ? listed : [])
    .filter((w) => w.url === callbackUrl && typeof w.id === "string")
    .map((w) => w.id as string);
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  trigger: OnfleetTriggerId;
  triggerName: string;
  sample: OnfleetEvent;
}

type Ingest = NonNullable<
  TriggerDefinition<TriggerParams, OnfleetEvent, TriggerState>["handleIngest"]
>;

/** Build one Onfleet webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, OnfleetEvent, TriggerState> {
  const handleIngest: Ingest = async ({ raw, params }) => {
    const method = String(raw.method).toUpperCase();

    if (method === "GET") {
      // Onfleet's URL validation: echo `check` back as plain text. It carries no secret, and the
      // reply is the random string itself — bounded to printable ASCII, 256 chars.
      const check = raw.query["check"];
      if (typeof check !== "string" || !CHECK_PATTERN.test(check)) {
        throw new Error("Onfleet validation refused: the check value is missing or malformed.");
      }
      return {
        events: [],
        response: { status: 200, headers: { "content-type": "text/plain" }, body: check },
      };
    }
    if (method !== "POST") throw new Error("Onfleet delivers webhooks with POST.");

    // Verify before parsing. `requireSecret` first: an unset secret must never compare equal to
    // an absent signature header.
    const secret = requireSecret(params.signingSecret);
    const body = requireRawBody(raw);
    const given = header(raw, "x-onfleet-signature");
    if (typeof given !== "string" || given === "") {
      throw new Error("Onfleet delivery refused: the signature header is missing.");
    }
    const expected = await hmacSha512Hex(secretBytes(secret), body);
    if (!timingSafeEqual(given.toLowerCase(), expected)) {
      throw new Error("Onfleet delivery refused: the signature does not match.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new Error("Onfleet delivery refused: the body is not JSON.");
    }
    const delivery = asObject(parsed);
    if (!delivery || typeof delivery.triggerId !== "number") {
      throw new Error("Not an Onfleet webhook delivery: expected a numeric triggerId.");
    }
    if (delivery.triggerId !== spec.trigger) return [];
    const data = asObject(delivery.data);
    return [{
      triggerId: delivery.triggerId,
      triggerName: str(delivery.triggerName),
      time: typeof delivery.time === "number" ? delivery.time : null,
      taskId: str(delivery.taskId),
      workerId: str(delivery.workerId),
      adminId: str(delivery.adminId),
      task: asObject(data?.task),
      worker: asObject(data?.worker),
    }];
  };

  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [SIGNING_SECRET_PARAM],
    output: EVENT_OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      // Fail before any vendor call if the pasted secret could never verify a delivery.
      secretBytes(requireSecret(params.signingSecret));
      const client = new OnfleetClient(ctx);
      for (const id of await leftovers(client, callbackUrl)) await deleteWebhook(client, id);
      const created = await client.request<{ id?: unknown }>("/webhooks", {
        method: "POST",
        body: { url: callbackUrl, name: `w6w ${spec.triggerName}`, trigger: spec.trigger },
      });
      const webhookId = str(created?.id);
      if (!webhookId) throw new Error("Onfleet created the webhook but returned no id.");
      return { webhookId, trigger: spec.trigger };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      if (state?.webhookId) await deleteWebhook(new OnfleetClient(ctx), state.webhookId);
    },

    handleIngest,
  };
}
