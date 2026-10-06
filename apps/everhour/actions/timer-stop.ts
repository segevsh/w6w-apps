import type { ActionDefinition } from "@w6w/types";
import { EverhourClient } from "../lib/client.ts";

/**
 * `DELETE /timers/current` — Stop the key owner's running timer.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
// deno-lint-ignore no-empty-interface
interface Input {}

const timerStop: ActionDefinition<Input> = {
  key: "timer-stop",
  type: "perform",
  resource: "timer",
  title: "Stop Timer",
  description: "Stop the key owner's running timer.",
  idempotent: true,
  params: [],
  output: [
    { key: "status", type: "string", label: "active or stopped" },
    { key: "duration", type: "number", label: "Seconds" },
    { key: "task", type: "object", label: "Task" },
    { key: "user", type: "object", label: "User" },
  ],

  execute(_input, ctx) {
    return new EverhourClient(ctx).one(`/timers/current`, { method: "DELETE" });
  },
};

export default timerStop;
