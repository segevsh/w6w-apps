import { pollFromListAction } from "../../_shared/poll/mod.ts";
import eventList from "../actions/event-list.ts";

/**
 * `GET /v1/events?latestFirst=true` — "events are ordered by createdAt (direction from sort when
 * provided, else newest first)" (https://developer.iclosed.io, OpenAPI `Get Events`, verified
 * 2026-11-10). `sort` is left unset on purpose: it would switch the order to event name.
 */
export default pollFromListAction({
  key: "new-event",
  title: "New Event",
  description: "The run gets each event type (booking page) newly created in iClosed.",
  action: eventList,
  input: () => ({ latestFirst: "true", limit: 100, page: 0 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [
    { key: "id", type: "number", label: "Event ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "eventType", type: "string", label: "Event type" },
    { key: "status", type: "string", label: "Status" },
    { key: "duration", type: "number", label: "Duration" },
    { key: "linkPrefix", type: "string", label: "Link prefix" },
  ],
  sample: {
    id: 31,
    name: "Strategy call",
    eventType: "STRATEGY_EVENT",
    status: "ACTIVE",
    duration: 45,
    durationUnit: "MINUTES",
    linkPrefix: "strategy-call",
  },
});
