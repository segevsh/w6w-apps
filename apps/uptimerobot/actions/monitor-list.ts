import type { ActionDefinition } from "@w6w/types";
import { UptimeRobotClient } from "../lib/client.ts";

interface Input {
  search?: string;
  statuses?: number[];
  types?: number[];
  limit?: number;
  offset?: number;
}

interface Output {
  monitors: unknown[];
}

/**
 * POST /getMonitors — list monitors in the account, optionally filtered.
 *
 * `getMonitors` is UptimeRobot's "Swiss-Army knife" endpoint: it also serves
 * `monitor-get` (below) via the `monitors` id filter. This action covers the
 * unfiltered/listing case; `statuses` and `types` are joined with `-` per
 * UptimeRobot's own multi-value convention (`statuses=2-9`, `types=1-3-4`).
 */
const monitorList: ActionDefinition<Input, Output> = {
  key: "monitor-list",
  type: "read",
  resource: "monitor",
  title: "List Monitors",
  description: "List monitors in the account, optionally filtered by status, type, or search.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Keyword matched against monitor URL and friendly name.",
    },
    {
      key: "statuses",
      label: "Statuses",
      type: "multiselect",
      options: [
        { value: 0, label: "Paused" },
        { value: 1, label: "Not checked yet" },
        { value: 2, label: "Up" },
        { value: 8, label: "Seems down" },
        { value: 9, label: "Down" },
      ],
    },
    {
      key: "types",
      label: "Types",
      type: "multiselect",
      options: [
        { value: 1, label: "HTTP(S)" },
        { value: 2, label: "Keyword" },
        { value: 3, label: "Ping" },
        { value: 4, label: "Port" },
        { value: 5, label: "Heartbeat" },
      ],
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { min: 1, max: 100 },
    },
    { key: "offset", label: "Offset", type: "number", advanced: true },
  ],
  output: [{ key: "monitors", type: "array", label: "Monitors" }],

  async execute(input, ctx) {
    const client = new UptimeRobotClient(ctx);
    const res = await client.request<
      { stat: "ok"; monitors: unknown[] } & Record<string, unknown>
    >("/getMonitors", {
      search: input.search,
      statuses: input.statuses?.join("-"),
      types: input.types?.join("-"),
      limit: input.limit,
      offset: input.offset,
    });
    return { monitors: res.monitors };
  },
};

export default monitorList;
