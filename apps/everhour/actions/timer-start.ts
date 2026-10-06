import type { ActionDefinition } from "@w6w/types";
import { compact, EverhourClient } from "../lib/client.ts";

/**
 * `POST /timers` — Start the key owner's timer on a task (stopping any running one).
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  task: string;
  userDate?: string;
  comment?: string;
}

const timerStart: ActionDefinition<Input> = {
  key: "timer-start",
  type: "perform",
  resource: "timer",
  title: "Start Timer",
  description: "Start the key owner's timer on a task (stopping any running one).",
  idempotent: false,
  params: [
    { key: "task", label: "Task ID", type: "string", required: true },
    {
      key: "userDate",
      label: "User date",
      type: "date",
      hint: "YYYY-MM-DD in the user's timezone.",
    },
    { key: "comment", label: "Comment", type: "text" },
  ],
  output: [
    { key: "status", type: "string", label: "active or stopped" },
    { key: "duration", type: "number", label: "Seconds" },
    { key: "task", type: "object", label: "Task" },
    { key: "user", type: "object", label: "User" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/timers`, {
      method: "POST",
      body: compact({ task: input.task, userDate: input.userDate, comment: input.comment }),
    });
  },
};

export default timerStart;
