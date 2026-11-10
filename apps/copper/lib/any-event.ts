import type { HookContext, TriggerDefinition } from "@w6w/types";
import { randomSecret } from "../../_shared/webhook/mod.ts";
import { CopperClient } from "./client.ts";
import {
  type CopperRecordEvent,
  deleteSubscription,
  EVENT_OUTPUT,
  recordEvents,
  SECRET_FIELD,
  str,
  verifiedDelivery,
} from "./triggers.ts";

/**
 * The Any Event trigger. Copper subscriptions are per (entity type, event), so this trigger
 * registers one subscription for each name in `events` — or for every pair when `events` is empty —
 * all pointed at the same callback URL and sharing one random secret kept in the trigger state.
 *
 * Types and events are those the "Create new subscription" reference accepts:
 * https://developer.copper.com/webhooks/create-new-subscription.html (verified 2026-11-10).
 * `activity_log` appears in the Overview's entity table but not in that reference, so it is not
 * registered (New Activity is a poll trigger).
 */
export const ANY_TYPES = ["lead", "person", "company", "opportunity", "project", "task"] as const;
export const ANY_EVENTS = ["new", "update", "delete"] as const;

/** Every subscribable `<type>.<event>` name, e.g. `person.new`. */
export const ALL_EVENT_NAMES: string[] = ANY_TYPES.flatMap((t) =>
  ANY_EVENTS.map((e) => `${t}.${e}`)
);

export interface AnyEventParams {
  events?: string;
}

export interface AnyEventState {
  webhookIds: string[];
  secret: string;
  events: string[];
}

/** Parse the comma-separated `events` param; empty means every subscribable event. */
export function parseEventNames(raw: unknown): string[] {
  const text = typeof raw === "string" ? raw : "";
  const names = text.split(",").map((n) => n.trim().toLowerCase()).filter((n) => n !== "");
  if (names.length === 0) return [...ALL_EVENT_NAMES];
  const unknown = names.filter((n) => !ALL_EVENT_NAMES.includes(n));
  if (unknown.length > 0) {
    throw new Error(
      `Copper Any Event: unknown event name(s) ${
        unknown.join(", ")
      }. Use <type>.<event> with type ` +
        `in ${ANY_TYPES.join("/")} and event in ${ANY_EVENTS.join("/")}, for example person.new.`,
    );
  }
  return [...new Set(names)];
}

export function anyEventTrigger(spec: { key: string }): TriggerDefinition<
  AnyEventParams,
  CopperRecordEvent,
  AnyEventState
> {
  return {
    key: spec.key,
    title: "Any Event",
    description:
      "The run gets the id of each Copper record that is created, updated or deleted, for the " +
      "record types and events you list (default: all of them).",
    params: [
      {
        key: "events",
        label: "Events",
        type: "string",
        hint:
          "Comma-separated Copper events as <type>.<event>, for example `person.new, lead.update, " +
          "task.delete`. Types: lead, person, company, opportunity, project, task. Events: new, " +
          "update, delete. Leave empty for all 18; each one uses a subscription of the account's 100.",
      },
    ],
    output: EVENT_OUTPUT,
    sample: {
      id: 123,
      type: "project",
      event: "new",
      subscriptionId: 17065,
      timestamp: "2026-11-10T12:00:00.000Z",
      updatedAttributes: null,
    },

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const events = parseEventNames(params?.events);
      const client = new CopperClient(ctx);
      const listed = await client.request<Array<{ id?: unknown; target?: unknown }>>("/webhooks");
      for (const w of Array.isArray(listed) ? listed : []) {
        const id = str(w.id);
        if (id && w.target === callbackUrl) await deleteSubscription(client, id);
      }
      const secret = randomSecret();
      const webhookIds: string[] = [];
      try {
        for (const name of events) {
          const [type, event] = name.split(".");
          const created = await client.request<{ id?: unknown }>("/webhooks", {
            method: "POST",
            body: { target: callbackUrl, type, event, secret: { [SECRET_FIELD]: secret } },
          });
          const id = str(created?.id);
          if (!id) throw new Error("Copper created the subscription but returned no id.");
          webhookIds.push(id);
        }
      } catch (err) {
        for (const id of webhookIds) await deleteSubscription(client, id).catch(() => {});
        throw err;
      }
      return { webhookIds, secret, events };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const client = new CopperClient(ctx);
      for (const id of state?.webhookIds ?? []) await deleteSubscription(client, id);
    },

    handleIngest({ raw, state }) {
      const delivery = verifiedDelivery(raw, state?.secret);
      const name = `${String(delivery.type)}.${String(delivery.event)}`;
      if (!(state?.events ?? []).includes(name)) return [];
      return recordEvents(delivery);
    },
  };
}
