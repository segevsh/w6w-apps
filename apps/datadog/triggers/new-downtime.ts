import { snapshotFeed } from "../lib/triggers.ts";
import downtimeList from "../actions/downtime-list.ts";

/**
 * Wraps `downtime-list` (`GET /api/v2/downtime`, `page[offset]` + `page[limit]`, default 30). The
 * endpoint has no sort or created-after filter, so the downtimes it returns (including expired
 * ones, which Datadog keeps for about two days after cancelling) are walked 100 at a time and diffed.
 */
export default snapshotFeed({
  key: "new-downtime",
  title: "New Downtime",
  description: "The run gets each Datadog downtime newly scheduled.",
  action: downtimeList,
  pageSize: 100,
  input: ({ cursor, pageSize }) => ({ limit: pageSize, offset: cursor * pageSize }),
  items: (result) => (result as { data?: Array<Record<string, unknown>> }).data ?? [],
  idOf: (item) => String(item.id ?? ""),
  output: [
    { key: "id", type: "string", label: "Downtime ID" },
    { key: "type", type: "string", label: "Resource type (downtime)" },
    { key: "attributes", type: "object", label: "Schedule, scope, message and status" },
  ],
  sample: {
    id: "00000000-0000-0000-0000-000000000001",
    type: "downtime",
    attributes: {
      display_timezone: "UTC",
      message: "Deploy window",
      scope: "env:prod",
      status: "scheduled",
      created: "2026-11-09T10:00:00+00:00",
    },
  },
});
