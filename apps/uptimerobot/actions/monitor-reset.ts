import type { ActionDefinition } from "@w6w/types";
import { UptimeRobotClient } from "../lib/client.ts";

interface Input {
  monitorId: string | number;
}

/** POST /resetMonitor — reset a monitor's uptime stats and logs. */
const monitorReset: ActionDefinition<Input> = {
  key: "monitor-reset",
  type: "perform",
  resource: "monitor",
  title: "Reset Monitor",
  description: "Reset a monitor's uptime statistics and logs.",
  idempotent: true,
  params: [
    { key: "monitorId", label: "Monitor ID", type: "string", required: true },
  ],
  output: [{ key: "id", type: "number", label: "Monitor ID" }],

  async execute(input, ctx) {
    const client = new UptimeRobotClient(ctx);
    const res = await client.request<
      { stat: "ok"; monitor: { id: number } } & Record<string, unknown>
    >("/resetMonitor", { id: input.monitorId });
    return { id: res.monitor.id };
  },
};

export default monitorReset;
