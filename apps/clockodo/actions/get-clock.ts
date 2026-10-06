import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, optInt } from "../lib/client.ts";

interface Input {
  usersId?: number | string;
}

const getClock: ActionDefinition<Input> = {
  key: "get-clock",
  type: "read",
  resource: "clock",
  title: "Get Running Clock",
  description:
    "Read the running clock entry of a user (GET /v2/clock); `running` is null when nothing is running. Defaults to the authenticated user.",
  params: [
    {
      key: "usersId",
      label: "User ID",
      type: "number",
    },
  ],
  output: [
    { key: "running", type: "object", label: "The running clock entry, or null" },
    { key: "stopped", type: "object", label: "The last stopped entry, if any" },
    { key: "current_time", type: "string", label: "Server time" },
  ],

  async execute(input, ctx) {
    const body = await new ClockodoClient(ctx).call("/v2/clock", {
      query: { users_id: optInt(input.usersId, "usersId") },
    });
    return {
      running: body.running ?? null,
      stopped: body.stopped ?? null,
      current_time: body.current_time ?? null,
    };
  },
};

export default getClock;
