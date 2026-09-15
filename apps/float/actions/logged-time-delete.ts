import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";

/**
 * `DELETE /v3/logged-time/{logged_time_id}` — delete a logged time entry.
 *
 * Also 403s if the associated Project or Phase is archived, distinct from
 * the "Time Tracking is not enabled" case every other Logged Time endpoint
 * can also return.
 */
interface Input {
  logged_time_id: string;
}

const loggedTimeDelete: ActionDefinition<Input> = {
  key: "logged-time-delete",
  type: "perform",
  resource: "logged-time",
  title: "Delete Logged Time",
  description:
    "Delete a logged time entry. 403s if Time Tracking is off, or if the associated project or " +
    "phase is archived.",
  idempotent: true,
  params: [
    {
      key: "logged_time_id",
      label: "Logged time ID",
      type: "string",
      required: true,
      hint: "A string ID (not an integer). Take it from a list response's logged_time_id field.",
    },
  ],
  output: [],

  async execute(input, ctx) {
    await new FloatClient(ctx).remove(`/logged-time/${encodeURIComponent(input.logged_time_id)}`);
    return { deleted: true, logged_time_id: input.logged_time_id };
  },
};

export default loggedTimeDelete;
