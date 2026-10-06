import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, intId, optInt } from "../lib/client.ts";

interface Input {
  id: string;
  timeUntil?: string;
  usersId?: number | string;
  startNew?: boolean;
  away?: number | string;
}

const stopClock: ActionDefinition<Input> = {
  key: "stop-clock",
  type: "perform",
  resource: "clock",
  title: "Stop Clock",
  description:
    "Stop a running clock entry (DELETE /v2/clock/{id}); `id` is the running entry's id from Get Running Clock. Optionally set the end time, mark the user away, or start a new clock straight away.",
  params: [
    {
      key: "id",
      label: "Running entry ID",
      type: "string",
      required: true,
    },
    {
      key: "timeUntil",
      label: "Time until",
      type: "string",
      hint: "End time, ISO 8601 UTC. Defaults to now.",
    },
    {
      key: "usersId",
      label: "User ID",
      type: "number",
    },
    {
      key: "startNew",
      label: "Start new clock",
      type: "boolean",
      hint: "Immediately start a new clock with the same settings.",
    },
    {
      key: "away",
      label: "Away minutes",
      type: "number",
      hint: "Minutes the user was away, cut from the entry.",
    },
  ],
  output: [
    {
      key: "running",
      type: "object",
      label: "The new running entry when startNew was set, else null",
    },
    { key: "stopped", type: "object", label: "The stopped entry" },
    { key: "current_time", type: "string", label: "Server time" },
  ],
  idempotent: true,

  async execute(input, ctx) {
    const id = intId(input.id, "id");
    const body = await new ClockodoClient(ctx).call(`/v2/clock/${id}`, {
      method: "DELETE",
      query: {
        time_until: input.timeUntil,
        users_id: optInt(input.usersId, "usersId"),
        start_new: input.startNew,
        away: input.away === undefined || input.away === "" ? undefined : Number(input.away),
      },
    });
    return {
      running: body.running ?? null,
      stopped: body.stopped ?? null,
      current_time: body.current_time ?? null,
    };
  },
};

export default stopClock;
