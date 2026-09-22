import type { ActionDefinition } from "@w6w/types";
import { encodeId, WorkizClient } from "../lib/client.ts";
import type { TimeOff } from "../lib/schema.ts";

/**
 * `GET /TimeOff/get/{USER_NAME}` — one user's time off.
 *
 * `USER_NAME` is the team member's **name**, not their id — that is the
 * vendor's choice, and it is why the value is path-escaped here. The response
 * is a bare array of `{start, end, userName}` windows for that user.
 */
interface Input {
  userName: string;
}

const timeOffListForUser: ActionDefinition<Input, { items: TimeOff[] }> = {
  key: "time-off-list-for-user",
  type: "read",
  resource: "time-off",
  title: "List Time Off for a User",
  description: "Read one team member's time off, addressed by their name.",
  params: [
    {
      key: "userName",
      label: "User name",
      type: "string",
      required: true,
      hint: "The team member's name — Workiz addresses this endpoint by name, not by id.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Time-off windows" },
  ],

  async execute(input, ctx) {
    const items = await new WorkizClient(ctx).json<TimeOff[]>(
      `/TimeOff/get/${encodeId(input.userName)}`,
    );
    return { items: items ?? [] };
  },
};

export default timeOffListForUser;
