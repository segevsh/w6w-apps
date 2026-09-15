import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";

/**
 * `GET /v3/logged-time/{logged_time_id}` — retrieve a single logged time
 * entry.
 *
 * `logged_time_id` is a STRING (a Mongo-style id like
 * `5e38963be429adc74664c777`) — every other Float resource id is an integer.
 */
interface Input {
  logged_time_id: string;
}

const loggedTimeGet: ActionDefinition<Input> = {
  key: "logged-time-get",
  type: "read",
  resource: "logged-time",
  title: "Get Logged Time",
  description: "Retrieve a single logged time entry by ID.",
  params: [
    {
      key: "logged_time_id",
      label: "Logged time ID",
      type: "string",
      required: true,
      placeholder: "5e38963be429adc74664c777",
      hint: "A string ID (not an integer, unlike other Float resources) — take it from a list " +
        "response's logged_time_id field.",
    },
  ],
  output: [
    { key: "logged_time_id", type: "string", label: "Logged time ID" },
    { key: "people_id", type: "number", label: "Person ID" },
    { key: "hours", type: "number", label: "Hours" },
  ],

  async execute(input, ctx) {
    return await new FloatClient(ctx).json(
      `/logged-time/${encodeURIComponent(input.logged_time_id)}`,
    );
  },
};

export default loggedTimeGet;
