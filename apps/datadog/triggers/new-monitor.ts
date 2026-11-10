import { snapshotFeed } from "../lib/triggers.ts";
import monitorList from "../actions/monitor-list.ts";

/**
 * Wraps `monitor-list` (`GET /api/v1/monitor`, `page` + `page_size`, 1000 per page at most). The
 * endpoint documents no sort or created-after filter, so the full list is walked and diffed; the
 * walk stops at the kit's 5000-record ceiling with an error rather than missing monitors.
 * `monitor-search` returns the same records and is covered by this trigger.
 */
export default snapshotFeed({
  key: "new-monitor",
  title: "New Monitor",
  description: "The run gets each Datadog monitor newly created in the organization.",
  action: monitorList,
  pageSize: 1000,
  input: ({ cursor, pageSize }) => ({ page: cursor, pageSize }),
  items: (result) => (result as { monitors?: Array<Record<string, unknown>> }).monitors ?? [],
  idOf: (item) => String(item.id ?? ""),
  output: [
    { key: "id", type: "number", label: "Monitor ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Monitor type" },
    { key: "query", type: "string", label: "Query" },
    { key: "overall_state", type: "string", label: "Overall state" },
    { key: "created", type: "string", label: "Created at" },
    { key: "modified", type: "string", label: "Last modified at" },
  ],
  sample: {
    id: 1234567,
    name: "CPU high on web hosts",
    type: "metric alert",
    query: "avg(last_5m):avg:system.cpu.user{env:prod} > 90",
    overall_state: "OK",
    created: "2026-11-09T10:00:00.000000+00:00",
    modified: "2026-11-09T10:00:00.000000+00:00",
  },
});
