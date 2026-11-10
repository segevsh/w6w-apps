import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { WebexClient } from "./client.ts";

/**
 * Webex webhook triggers (rfcs/trigger.md, webhook form).
 *
 * `POST /webhooks` accepts a caller-chosen `secret` (D5 (1)); Webex then sends `X-Spark-Signature`,
 * the hex HMAC-SHA1 of the unmodified raw request body keyed by that secret. There is no delivery
 * timestamp, so the check has no replay window.
 *
 *   - `onSubscribe` deletes any webhook already pointed at this subscription's `callbackUrl` (a
 *     leftover of an attempt that never recorded its id), looks up who the connection is, then
 *     creates the webhook with a fresh random secret, kept in subscription state.
 *   - `onUnsubscribe` deletes it; one Webex no longer has counts as deleted.
 *   - `handleIngest` verifies the signature over the raw body before it parses anything.
 *   - `parseOutput` fetches the message a `messages` delivery points at: Webex's notification
 *     carries ids only, never the text.
 */

export interface TriggerParams {
  roomId?: string;
  includeOwnMessages?: boolean;
}

export interface TriggerState {
  webhookId: string;
  secret: string;
  resource: string;
  event: string;
  personId: string | null;
}

export interface WebexEvent {
  webhookId: string | null;
  resource: string;
  event: string;
  actorId: string | null;
  orgId: string | null;
  createdAt: string | null;
  id: string | null;
  roomId: string | null;
  personId: string | null;
  personEmail: string | null;
  text: string | null;
  message: Record<string, unknown> | null;
  data: Record<string, unknown>;
}

export const EVENT_OUTPUT: OutputField[] = [
  { key: "webhookId", type: "string", label: "Webhook ID" },
  { key: "resource", type: "string", label: "Resource" },
  { key: "event", type: "string", label: "Event" },
  { key: "actorId", type: "string", label: "Actor ID" },
  { key: "orgId", type: "string", label: "Organization ID" },
  { key: "createdAt", type: "string", label: "Created At" },
  { key: "id", type: "string", label: "Record ID" },
  { key: "roomId", type: "string", label: "Room ID" },
  { key: "personId", type: "string", label: "Person ID" },
  { key: "personEmail", type: "string", label: "Person Email" },
  { key: "text", type: "string", label: "Text" },
  { key: "message", type: "object", label: "Message" },
  { key: "data", type: "object", label: "Delivery Data" },
];

export const MESSAGE_SAMPLE: WebexEvent = {
  webhookId: "Y2lzY29zcGFyazovL3VzL1dFQkhPT0svZjRlNjA1NjAtNjYwMi00ZmIwLWEyNWEtOTQ5ODgxNjA5NDk3",
  resource: "messages",
  event: "created",
  actorId: "Y2lzY29zcGFyazovL3VzL1BFT1BMRS83MTZlOWQxYy1hMjM1LTQ4MTUtOTExNS1hMzRmYzE4YjVlOTI",
  orgId: "Y2lzY29zcGFyazovL3VzL09SR0FOSVpBVElPTi8xZWI2NWZkZi05NjQzLTQxN2YtOTk3NC1hZDcyY2FlMGUxMGY",
  createdAt: "2026-01-01T12:00:00.000Z",
  id: "Y2lzY29zcGFyazovL3VzL01FU1NBR0UvOTJkYjNiZTAtNDNiZC0xMWU2LThhZTktZGQ1YjNkZmM1NjVk",
  roomId: "Y2lzY29zcGFyazovL3VzL1JPT00vYmJjZWIxYWQtNDNmMS0zYjU4LTkxNDctZjE0YmIwYzRkMTU0",
  personId: "Y2lzY29zcGFyazovL3VzL1BFT1BMRS83MTZlOWQxYy1hMjM1LTQ4MTUtOTExNS1hMzRmYzE4YjVlOTI",
  personEmail: "matt@example.com",
  text: "Hello",
  message: { id: "Y2lzY29zcGFyazovL3VzL01FU1NBR0UvOTJkYjNiZTA", text: "Hello" },
  data: { id: "Y2lzY29zcGFyazovL3VzL01FU1NBR0UvOTJkYjNiZTA", personEmail: "matt@example.com" },
};

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

/** The HTTP status in a `WebexClient` error message ("Webex 404 for GET /v1/…"), if any. */
function statusOf(err: unknown): number | null {
  const m = /^Webex (\d{3}) /.exec(err instanceof Error ? err.message : "");
  return m ? Number(m[1]) : null;
}

async function deleteWebhook(client: WebexClient, id: string): Promise<void> {
  try {
    await client.request(`/webhooks/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (err) {
    const status = statusOf(err);
    if (status === 404 || status === 410) return;
    throw err;
  }
}

async function webhooksPointingAt(client: WebexClient, targetUrl: string): Promise<string[]> {
  const res = await client.request<{ items?: Array<{ id?: unknown; targetUrl?: unknown }> }>(
    "/webhooks",
    { query: { max: 100 } },
  );
  const ids: string[] = [];
  for (const w of res?.items ?? []) {
    const id = str(w.id);
    if (id && w.targetUrl === targetUrl) ids.push(id);
  }
  return ids;
}

async function fetchMessage(ctx: HookContext, id: string): Promise<Record<string, unknown> | null> {
  try {
    return asObject(
      await new WebexClient(ctx).request(`/messages/${encodeURIComponent(id)}`),
    );
  } catch (err) {
    const status = statusOf(err);
    // 403/404/410: deleted, or not readable by this connection (a bot sees only messages naming it).
    if (status === 403 || status === 404 || status === 410) return null;
    throw err;
  }
}

export interface WebexTriggerSpec {
  key: string;
  title: string;
  description: string;
  resource: "messages" | "memberships";
  event: "created";
  sample: WebexEvent;
}

export function webexTrigger(
  spec: WebexTriggerSpec,
): TriggerDefinition<TriggerParams, WebexEvent, TriggerState> {
  const params: Param[] = [{
    key: "roomId",
    label: "Room ID",
    type: "string",
    advanced: true,
    hint: "Only deliveries for this room. Leave empty for every room the connection can see.",
  }];
  if (spec.resource === "messages") {
    params.push({
      key: "includeOwnMessages",
      label: "Include the connection's own messages",
      type: "boolean",
      default: false,
      advanced: true,
      hint:
        "Off by default so a workflow that posts a message cannot trigger itself. Turn on to also receive messages sent by the connected account.",
    });
  }

  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params,
    output: EVENT_OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, subscriptionId, callbackUrl }, ctx) {
      const client = new WebexClient(ctx);
      for (const id of await webhooksPointingAt(client, callbackUrl)) {
        await deleteWebhook(client, id);
      }
      let personId: string | null = null;
      if (spec.resource === "messages") {
        const me = asObject(await client.request("/people/me"));
        personId = str(me?.id);
      }
      const secret = randomSecret();
      const roomId = params?.roomId?.trim();
      const body: Record<string, unknown> = {
        name: `w6w ${subscriptionId}`,
        targetUrl: callbackUrl,
        resource: spec.resource,
        event: spec.event,
        secret,
      };
      if (roomId) body.filter = `roomId=${roomId}`;
      const created = asObject(await client.request("/webhooks", { method: "POST", body }));
      const webhookId = str(created?.id);
      if (!webhookId) throw new Error("Webex created the webhook but returned no id.");
      return { webhookId, secret, resource: spec.resource, event: spec.event, personId };
    },

    async onUnsubscribe({ state }, ctx) {
      const id = str((state as Partial<TriggerState> | undefined)?.webhookId);
      if (id) await deleteWebhook(new WebexClient(ctx), id);
    },

    async handleIngest({ raw, params, state }) {
      const st = state as Partial<TriggerState> | undefined;
      const secret = requireSecret(st?.secret);
      const body = requireRawBody(raw);
      const signature = header(raw, "x-spark-signature");
      if (!signature) throw new Error("Webex delivery refused: the signature header is missing.");
      const expected = await hmac("SHA-1", secret, body, "hex");
      if (!timingSafeEqual(expected, signature.toLowerCase())) {
        throw new Error("Webex delivery refused: the signature does not match.");
      }
      let payload: Record<string, unknown> | null;
      try {
        payload = asObject(JSON.parse(body));
      } catch {
        payload = null;
      }
      if (!payload) throw new Error("Webex delivery refused: the body is not a JSON object.");
      if (payload.resource !== spec.resource || payload.event !== spec.event) return [];
      const data = asObject(payload.data) ?? {};
      const actorId = str(payload.actorId);
      if (
        spec.resource === "messages" && params?.includeOwnMessages !== true &&
        st?.personId && actorId === st.personId
      ) return [];
      const roomId = str(data.roomId);
      const wantedRoom = params?.roomId?.trim();
      if (wantedRoom && roomId !== wantedRoom) return [];
      return [{
        webhookId: str(payload.id),
        resource: spec.resource,
        event: spec.event,
        actorId,
        orgId: str(payload.orgId),
        createdAt: str(payload.created),
        id: str(data.id),
        roomId,
        personId: str(data.personId),
        personEmail: str(data.personEmail),
        text: null,
        message: null,
        data,
      }];
    },

    async parseOutput({ normalized }, ctx): Promise<WebexEvent> {
      const event = normalized as WebexEvent;
      if (spec.resource !== "messages" || !event.id) return event;
      const message = await fetchMessage(ctx, event.id);
      return { ...event, message, text: str(message?.text) };
    },
  };
}
