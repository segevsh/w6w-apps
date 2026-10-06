import type { ActionDefinition } from "@w6w/types";
import { compact, listOf, numberOf, RingoverClient } from "../lib/client.ts";
import { limitParam, offsetParam } from "../lib/params.ts";

interface Input {
  direction?: string;
  limitCount?: number;
  limitOffset?: number;
}

const callLiveList: ActionDefinition<Input> = {
  key: "call-live-list",
  type: "read",
  resource: "call",
  title: "List Live Calls",
  description:
    "Snapshot of the calls in progress right now (ringing, answered, on hold). Standard users see only their own; Monitoring widens it to the team.",
  params: [
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [{ value: "IN", label: "Inbound" }, { value: "OUT", label: "Outbound" }],
    },
    limitParam(1000),
    offsetParam,
  ],
  output: [
    { key: "calls", type: "array", label: "Current calls" },
    { key: "count", type: "number", label: "Calls in this response" },
    { key: "total", type: "number", label: "Total current calls" },
  ],

  async execute(input, ctx) {
    const body = await new RingoverClient(ctx).request("POST", "/calls/current", {
      body: compact({
        direction: input.direction || undefined,
        limit_count: input.limitCount,
        limit_offset: input.limitOffset,
      }),
    });
    return {
      calls: listOf(body, "current_calls_list"),
      count: numberOf(body, "current_calls_list_count"),
      total: numberOf(body, "total_current_calls_count"),
    };
  },
};

export default callLiveList;
