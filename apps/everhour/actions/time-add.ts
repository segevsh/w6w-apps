import type { ActionDefinition } from "@w6w/types";
import { compact, EverhourClient } from "../lib/client.ts";

/**
 * `POST /time` — Log time against a task.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  time: number;
  date: string;
  task?: string;
  user?: number;
  comment?: string;
}

const timeAdd: ActionDefinition<Input> = {
  key: "time-add",
  type: "perform",
  resource: "time-record",
  title: "Add Time",
  description: "Log time against a task.",
  idempotent: false,
  params: [
    { key: "time", label: "Time", type: "number", required: true, hint: "Time in seconds." },
    { key: "date", label: "Date", type: "date", required: true, hint: "YYYY-MM-DD." },
    { key: "task", label: "Task ID", type: "string", hint: "Task the time is logged against." },
    { key: "user", label: "User ID", type: "number", hint: "Defaults to the key's owner." },
    { key: "comment", label: "Comment", type: "text" },
  ],
  output: [
    { key: "id", type: "number", label: "Time record ID" },
    { key: "time", type: "number", label: "Seconds" },
    { key: "date", type: "string", label: "Date" },
    { key: "user", type: "number", label: "User ID" },
    { key: "task", type: "object", label: "Task" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/time`, {
      method: "POST",
      body: compact({
        time: input.time,
        date: input.date,
        task: input.task,
        user: input.user,
        comment: input.comment,
      }),
    });
  },
};

export default timeAdd;
