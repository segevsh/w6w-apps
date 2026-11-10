import type { HookContext, TriggerDefinition } from "@w6w/types";
import { HeyGenClient } from "../lib/client.ts";
import {
  ENDPOINTS,
  type HeyGenEvent,
  isGone,
  normalizeDelivery,
  OUTPUT,
  str,
  type TriggerState,
  verifySignature,
} from "../lib/triggers.ts";
import { type AnyEventParams, PARAMS, parseEventTypes } from "../lib/any-event.ts";

const anyEvent: TriggerDefinition<AnyEventParams, HeyGenEvent, TriggerState> = {
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any HeyGen webhook event — videos, translations, avatars and more — or only the event types you list. The run gets the event type and id, the video id and callback id where HeyGen sends them, and the full event data.",
  params: PARAMS,
  output: OUTPUT,
  sample: {
    eventType: "video_translate.success",
    eventId: "evt_abc125",
    createdAt: "2026-11-10T12:09:00Z",
    videoId: null,
    videoUrl: null,
    videoPageUrl: null,
    callbackId: null,
    data: {},
  },

  async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
    const events = parseEventTypes(params?.events);
    const client = new HeyGenClient(ctx);
    const created = await client.data<{ endpoint_id?: unknown; secret?: unknown }>(ENDPOINTS, {
      method: "POST",
      body: events.length ? { url: callbackUrl, events } : { url: callbackUrl },
    });
    const endpointId = str(created?.endpoint_id);
    const secret = typeof created?.secret === "string" ? created.secret : "";
    if (!endpointId || secret === "") {
      if (endpointId) {
        try {
          await client.status(`${ENDPOINTS}/${encodeURIComponent(endpointId)}`, {
            method: "DELETE",
          });
        } catch { /* best-effort rollback */ }
      }
      throw new Error(
        "HeyGen did not return a webhook endpoint id and signing secret, so deliveries could not be verified.",
      );
    }
    return { endpointId, secret };
  },

  async onUnsubscribe({ state }, ctx: HookContext) {
    const s = state as Partial<TriggerState> | undefined;
    if (!s?.endpointId) return;
    try {
      await new HeyGenClient(ctx).status(`${ENDPOINTS}/${encodeURIComponent(s.endpointId)}`, {
        method: "DELETE",
      });
    } catch (err) {
      if (!isGone(err)) throw err;
    }
  },

  async handleIngest({ raw, params, state }) {
    if (raw.method.toUpperCase() !== "POST") {
      throw new Error(`HeyGen delivers webhooks with POST, not ${raw.method}.`);
    }
    const body = await verifySignature(raw, (state as Partial<TriggerState> | undefined)?.secret);
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new Error("HeyGen delivery refused: the body is not JSON.");
    }
    const event = normalizeDelivery(parsed);
    const wanted = parseEventTypes(params?.events);
    if (wanted.length && !wanted.includes(event.eventType)) return [];
    return [event];
  },
};

export default anyEvent;
