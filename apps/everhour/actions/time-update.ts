import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `PUT /time/{timeId}` — Change a time record.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  timeId: number;
  time: number;
  date: string;
  task?: string;
  user?: number;
  comment?: string;
}

const timeUpdate: ActionDefinition<Input> = {
  key: "time-update",
  type: "perform",
  resource: "time-record",
  title: "Update Time Record",
  description: "Change a time record.",
  idempotent: true,
  params: [
    {
      key: "timeId",
      label: "Time record ID",
      type: "number",
      required: true,
      hint: "Numeric time record id.",
    },
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
    return new EverhourClient(ctx).one(`/time/${encodeId(input.timeId)}`, {
      method: "PUT",
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

export default timeUpdate;
