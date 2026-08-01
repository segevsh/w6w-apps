import type { ActionDefinition } from "@w6w/types";
import { UptimeRobotClient } from "../lib/client.ts";

interface Input {
  monitorId: string | number;
}

/**
 * POST /getMonitors — a single monitor by id, via the same endpoint
 * `monitor-list` uses. UptimeRobot has no dedicated `getMonitor` method; a
 * single id passed to `monitors` narrows the (otherwise account-wide) list to
 * one entry, which this action unwraps.
 */
const monitorGet: ActionDefinition<Input> = {
  key: "monitor-get",
  type: "read",
  resource: "monitor",
  title: "Get Monitor",
  description: "Get a single monitor by ID.",
  params: [
    { key: "monitorId", label: "Monitor ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Monitor ID" },
    { key: "friendly_name", type: "string", label: "Friendly Name" },
    { key: "url", type: "string", label: "URL" },
    { key: "type", type: "number", label: "Type" },
    { key: "status", type: "number", label: "Status" },
  ],

  async execute(input, ctx) {
    const client = new UptimeRobotClient(ctx);
    const res = await client.request<
      { stat: "ok"; monitors: unknown[] } & Record<string, unknown>
    >("/getMonitors", { monitors: input.monitorId });
    const monitor = res.monitors[0];
    if (!monitor) throw new Error(`UptimeRobot: no monitor found with id ${input.monitorId}`);
    return monitor;
  },
};

export default monitorGet;
