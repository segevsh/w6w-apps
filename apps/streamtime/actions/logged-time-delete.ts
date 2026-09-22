import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `DELETE /logged_times/{logged_time_id}` — delete a time entry.
 *
 * The documented 200 is an open object with no named fields, so the action
 * reports the status code rather than guessing at a body.
 */
interface Input {
  loggedTimeId: number;
}

const loggedTimeDelete: ActionDefinition<Input, { deleted: boolean; status: number }> = {
  key: "logged-time-delete",
  type: "perform",
  resource: "logged-time",
  title: "Delete Logged Time",
  description: "Delete a logged time entry.",
  idempotent: true,
  params: [idParam("loggedTimeId", "Logged Time ID")],
  output: [
    { key: "deleted", type: "boolean", label: "The delete request succeeded" },
    { key: "status", type: "number", label: "HTTP status Streamtime answered with" },
  ],

  async execute(input, ctx) {
    const status = await new StreamtimeClient(ctx).status(
      `/logged_times/${encodeId(input.loggedTimeId)}`,
      { method: "DELETE" },
    );
    return { deleted: true, status };
  },
};

export default loggedTimeDelete;
