import type { ActionDefinition } from "@w6w/types";
import { HomeAssistantClient } from "../lib/client.ts";

/**
 * `GET /api/events` — event types, with how many things are listening.
 *
 * The `listener_count` is the useful part and the reason this is worth having:
 * it is the only way, before firing, to find out whether anything is listening
 * for an event type at all. A count of zero on the event a workflow is about to
 * fire means no automation will run — which `event-fire` itself cannot tell
 * you, because firing always succeeds.
 *
 * The names are also a useful spelling check: integrations define their own,
 * and a typo in an automation's trigger shows up here as an event type nobody
 * listens to.
 */
const action: ActionDefinition = {
  key: "event-list",
  type: "read",
  resource: "event",
  title: "List event types",
  description:
    "Event types with their listener counts — the only way to find out whether anything is " +
    "listening before firing, since firing always reports success.",
  params: [],
  output: [
    { key: "events", type: "array", label: "Event types with listener counts" },
    { key: "count", type: "number", label: "How many event types" },
    { key: "unlistened", type: "array", label: "Types nothing is listening for" },
  ],

  async execute(_input, ctx) {
    const result = await new HomeAssistantClient(ctx).request<
      Array<{ event: string; listener_count?: number }>
    >("/events");
    const events = Array.isArray(result) ? result : [];

    return {
      events,
      count: events.length,
      unlistened: events.filter((e) => Number(e?.listener_count ?? 0) === 0).map((e) => e.event),
    };
  },
};

export default action;
