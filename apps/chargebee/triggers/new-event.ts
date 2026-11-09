import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listEvents from "../actions/list-events.ts";

interface Params {
  eventType?: string;
}

function eventId(event: unknown): string {
  const id = (event as { id?: unknown }).id;
  if (typeof id !== "string" || !id) {
    throw new Error("Chargebee list events returned an event without id");
  }
  return id;
}

export default pollFromListAction<Params>({
  key: "new-event",
  title: "New Event",
  description: "Fires when Chargebee records a new event, optionally filtered by event type.",
  action: listEvents as ActionDefinition,
  input: ({ eventType }) => ({ eventType, limit: 100, sortOrder: "desc" }),
  items: (result) => {
    const list = (result as { list?: Array<{ event?: unknown }> }).list ?? [];
    return list.flatMap((row) => row.event === undefined ? [] : [row.event]);
  },
  idOf: eventId,
  params: [
    {
      key: "eventType",
      label: "Event type",
      type: "string",
      placeholder: "subscription_created",
      hint: "Optional exact Chargebee event type. Leave empty to receive every event.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "event_type", type: "string", label: "Event type" },
    { key: "occurred_at", type: "number", label: "Occurred at (Unix seconds)" },
  ],
  sample: { id: "ev_1", event_type: "subscription_created", occurred_at: 1762689600 },
});
