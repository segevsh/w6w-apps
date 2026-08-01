import type { ActionDefinition } from "@w6w/types";
import { UptimeRobotClient } from "../lib/client.ts";

interface Input {
  monitorId: string | number;
}

/** POST /deleteMonitor — permanently delete a monitor. */
const monitorDelete: ActionDefinition<Input> = {
  key: "monitor-delete",
  type: "perform",
  resource: "monitor",
  title: "Delete Monitor",
  description: "Permanently delete a monitor.",
  idempotent: true,
  params: [
    { key: "monitorId", label: "Monitor ID", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  async execute(input, ctx) {
    const client = new UptimeRobotClient(ctx);
    await client.request("/deleteMonitor", { id: input.monitorId });
    return { success: true };
  },
};

export default monitorDelete;
