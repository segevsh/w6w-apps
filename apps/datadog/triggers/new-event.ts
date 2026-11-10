import { pollFromListAction } from "../../_shared/poll/mod.ts";
import eventSearch from "../actions/event-search.ts";

/**
 * Wraps `event-search` (`GET /api/v2/events`) sorted `-timestamp` (newest first, the vendor's
 * documented `sort` value) at the action's maximum useful page size of 100. With no `from` Datadog
 * searches the last 15 minutes, which one check interval always covers.
 */
export default pollFromListAction<Record<string, unknown>>({
  key: "new-event",
  title: "New Event",
  description: "The run gets each new event on the Datadog event stream matching a search query.",
  action: eventSearch,
  params: eventSearch.params?.filter((p) => p.key === "query"),
  input: (params) => ({ query: params.query, sort: "-timestamp", limit: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "type", type: "string", label: "Resource type (event)" },
    { key: "attributes", type: "object", label: "Event attributes (timestamp, message, tags, …)" },
  ],
  sample: {
    id: "AAAAAXYZ",
    type: "event",
    attributes: {
      timestamp: "2026-11-09T10:00:00Z",
      attributes: { title: "Deploy finished", status: "ok" },
      tags: ["env:prod"],
    },
  },
});
