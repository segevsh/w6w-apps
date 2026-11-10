import { snapshotFeed } from "../lib/triggers.ts";
import hostList from "../actions/host-list.ts";

export const clock = { now: (): number => Date.now() };

/** Datadog retains host records for 7 days (the `host-list` hint), the widest window it serves. */
const WINDOW_SECONDS = 7 * 86_400;

/**
 * Wraps `host-list` (`GET /api/v1/hosts`, `start` offset + `count` up to 1000). With no `from`
 * Datadog returns only hosts that reported in the last 3 hours, so a host that went quiet would
 * come back as "new"; the trigger asks for the whole 7-day retention window instead and diffs.
 */
export default snapshotFeed({
  key: "new-host",
  title: "New Host",
  description: "The run gets each host that newly starts reporting to Datadog.",
  action: hostList,
  pageSize: 1000,
  input: ({ cursor, pageSize }) => ({
    from: Math.floor(clock.now() / 1000) - WINDOW_SECONDS,
    start: cursor * pageSize,
    count: pageSize,
  }),
  items: (result) => (result as { host_list?: Array<Record<string, unknown>> }).host_list ?? [],
  idOf: (item) => String(item.id ?? item.aws_id ?? item.name ?? ""),
  output: [
    { key: "id", type: "number", label: "Host ID (EC2 instances carry aws_id instead)" },
    { key: "name", type: "string", label: "Host name" },
    { key: "aliases", type: "array", label: "Aliases" },
    { key: "apps", type: "array", label: "Integrations reporting" },
    { key: "last_reported_time", type: "number", label: "Last report (POSIX seconds)" },
  ],
  sample: {
    id: 1234567890,
    name: "web-01",
    aliases: ["web-01.internal"],
    apps: ["agent", "system"],
    last_reported_time: 1_794_000_000,
  },
});
