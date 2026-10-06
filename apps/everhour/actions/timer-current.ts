import type { ActionDefinition } from "@w6w/types";
import { EverhourClient } from "../lib/client.ts";

/**
 * `GET /timers/current` — Fetch the key owner's current timer.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
// deno-lint-ignore no-empty-interface
interface Input {}

const timerCurrent: ActionDefinition<Input> = {
  key: "timer-current",
  type: "read",
  resource: "timer",
  title: "Get Running Timer",
  description: "Fetch the key owner's current timer.",
  params: [],
  output: [
    { key: "status", type: "string", label: "active or stopped" },
    { key: "duration", type: "number", label: "Seconds" },
    { key: "task", type: "object", label: "Task" },
    { key: "user", type: "object", label: "User" },
  ],

  execute(_input, ctx) {
    return new EverhourClient(ctx).one(`/timers/current`);
  },
};

export default timerCurrent;
