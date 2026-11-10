import type { TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { WebexClient } from "../lib/client.ts";
import {
  asObject,
  deleteWebhook,
  EVENT_OUTPUT,
  fetchMessage,
  MESSAGE_SAMPLE,
  str,
  type TriggerState,
  type WebexEvent,
  webhooksPointingAt,
} from "../lib/triggers.ts";
import { type AnyEventParams, PARAMS, parseEventNames } from "../lib/any-event.ts";

const anyEvent: TriggerDefinition<AnyEventParams, WebexEvent, TriggerState> = {
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any Webex messaging event — messages, space members and spaces — or only the ones you list. The run gets the resource, the event, who caused it and the record ids; a created message also carries its text.",
  params: PARAMS,
  output: EVENT_OUTPUT,
  sample: MESSAGE_SAMPLE,

  async onSubscribe({ params, subscriptionId, callbackUrl }, ctx) {
    parseEventNames(params?.events); // refuse a typo now, not by never firing
    const client = new WebexClient(ctx);
    for (const id of await webhooksPointingAt(client, callbackUrl)) {
      await deleteWebhook(client, id);
    }
    const secret = randomSecret();
    const created = asObject(
      await client.request("/webhooks", {
        method: "POST",
        body: {
          name: `w6w ${subscriptionId}`,
          targetUrl: callbackUrl,
          resource: "all",
          event: "all",
          secret,
        },
      }),
    );
    const webhookId = str(created?.id);
    if (!webhookId) throw new Error("Webex created the webhook but returned no id.");
    return { webhookId, secret, resource: "all", event: "all", personId: null };
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
    const resource = str(payload.resource);
    const event = str(payload.event);
    if (!resource || !event) {
      throw new Error("Webex delivery refused: the body names no resource and event.");
    }
    const wanted = parseEventNames(params?.events);
    if (wanted.length && !wanted.includes(`${resource}.${event}`)) return [];
    const data = asObject(payload.data) ?? {};
    return [{
      webhookId: str(payload.id),
      resource,
      event,
      actorId: str(payload.actorId),
      orgId: str(payload.orgId),
      createdAt: str(payload.created),
      id: str(data.id),
      roomId: resource === "rooms" ? str(data.id) : str(data.roomId),
      personId: str(data.personId),
      personEmail: str(data.personEmail),
      text: null,
      message: null,
      data,
    }];
  },

  async parseOutput({ normalized }, ctx): Promise<WebexEvent> {
    const event = normalized as WebexEvent;
    if (event.resource !== "messages" || event.event !== "created" || !event.id) return event;
    const message = await fetchMessage(ctx, event.id);
    return { ...event, message, text: str(message?.text) };
  },
};

export default anyEvent;
