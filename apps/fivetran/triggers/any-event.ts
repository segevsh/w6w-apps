import type { HookContext, TriggerDefinition } from "@w6w/types";
import { randomSecret } from "../../_shared/webhook/mod.ts";
import { FivetranClient } from "../lib/client.ts";
import {
  type FivetranEvent,
  GROUP_PARAM,
  isGone,
  normalizeDelivery,
  OUTPUT,
  str,
  type TriggerState,
  verifySignature,
} from "../lib/triggers.ts";
import {
  ALL_EVENTS,
  type AnyEventParams,
  EVENTS_PARAM,
  parseEventNames,
} from "../lib/any-event.ts";

const anyEvent: TriggerDefinition<AnyEventParams, FivetranEvent, TriggerState> = {
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any Fivetran webhook event — syncs, transformations and connection changes — or only the ones you list. The run gets the event name, its time, the connection and destination where Fivetran sends them, and the vendor's details in data.",
  params: [EVENTS_PARAM, GROUP_PARAM],
  output: OUTPUT,
  sample: {
    event: "sync_end",
    created: "2026-11-10T09:30:00.386Z",
    connectorType: "postgres",
    connectorId: "mystified_presiding",
    connectorName: "mystified_presiding",
    syncId: "7b2c4e1a-0d3f-4a55-9a1e-5f6b7c8d9e0f",
    destinationGroupId: "deck_enjoy",
    data: { status: "SUCCESSFUL" },
  },

  async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
    const wanted = parseEventNames(params?.events);
    const events = wanted.length ? wanted : [...ALL_EVENTS];
    const groupId = params?.groupId?.trim();
    const secret = randomSecret();
    const created = await new FivetranClient(ctx).request<{ id?: unknown }>(
      groupId ? `/v1/webhooks/group/${encodeURIComponent(groupId)}` : "/v1/webhooks/account",
      { method: "POST", body: { url: callbackUrl, events, active: true, secret } },
    );
    const webhookId = str(created?.id);
    if (!webhookId) throw new Error("Fivetran did not return the id of the webhook it created.");
    return { webhookId, secret };
  },

  async onUnsubscribe({ state }, ctx: HookContext) {
    const s = state as Partial<TriggerState> | undefined;
    if (!s?.webhookId) return;
    try {
      await new FivetranClient(ctx).request(`/v1/webhooks/${encodeURIComponent(s.webhookId)}`, {
        method: "DELETE",
      });
    } catch (err) {
      if (!isGone(err)) throw err;
    }
  },

  async handleIngest({ raw, params, state }) {
    if (raw.method.toUpperCase() !== "POST") {
      throw new Error(`Fivetran delivers webhooks with POST, not ${raw.method}.`);
    }
    const body = await verifySignature(raw, state?.secret);
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new Error("Fivetran delivery refused: the body is not JSON.");
    }
    const event = normalizeDelivery(parsed);
    const wanted = parseEventNames(params?.events);
    if (wanted.length && !wanted.includes(event.event)) return [];
    return [event];
  },
};

export default anyEvent;
