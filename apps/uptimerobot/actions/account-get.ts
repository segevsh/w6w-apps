import type { ActionDefinition } from "@w6w/types";
import { UptimeRobotClient } from "../lib/client.ts";

interface Output {
  email: string;
  monitorLimit: number;
  monitorInterval: number;
  upMonitors: number;
  downMonitors: number;
  pausedMonitors: number;
}

/**
 * POST /getAccountDetails — the account's monitor limit and monitor-count
 * breakdown. Takes no parameters beyond the API key (injected by `sign`).
 */
const accountGet: ActionDefinition<Record<string, never>, Output> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account Details",
  description: "Get the connected account's monitor limit, interval, and monitor counts.",
  params: [],
  output: [
    { key: "email", type: "string", label: "Account Email" },
    { key: "monitorLimit", type: "number", label: "Monitor Limit" },
    { key: "monitorInterval", type: "number", label: "Monitor Interval (minutes)" },
    { key: "upMonitors", type: "number", label: "Up Monitors" },
    { key: "downMonitors", type: "number", label: "Down Monitors" },
    { key: "pausedMonitors", type: "number", label: "Paused Monitors" },
  ],

  async execute(_input, ctx) {
    const client = new UptimeRobotClient(ctx);
    const res = await client.request<
      { stat: "ok"; account: Record<string, unknown> } & Record<string, unknown>
    >("/getAccountDetails");
    const a = res.account as {
      email: string;
      monitor_limit: number;
      monitor_interval: number;
      up_monitors: number;
      down_monitors: number;
      paused_monitors: number;
    };
    return {
      email: a.email,
      monitorLimit: a.monitor_limit,
      monitorInterval: a.monitor_interval,
      upMonitors: a.up_monitors,
      downMonitors: a.down_monitors,
      pausedMonitors: a.paused_monitors,
    };
  },
};

export default accountGet;
