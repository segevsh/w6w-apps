import type { ActionDefinition } from "@w6w/types";
import { WorkizClient } from "../lib/client.ts";
import type { TimeOff } from "../lib/schema.ts";

/**
 * `GET /TimeOff/get/` — company-wide time off.
 *
 * The one `all` flag in this API: it means "get all users and company time
 * off", as opposed to the per-user read at `/TimeOff/get/{USER_NAME}`. Workiz
 * declares it optional with a default of `false`.
 *
 * The response is a bare array of `{start, end, userName}` windows.
 */
interface Input {
  all?: boolean;
}

const timeOffList: ActionDefinition<Input, { items: TimeOff[] }> = {
  key: "time-off-list",
  type: "read",
  resource: "time-off",
  title: "List Time Off",
  description: "Read company time off, optionally including every user's time off.",
  params: [
    {
      key: "all",
      label: "All users",
      type: "boolean",
      default: false,
      hint: "Off by default, matching Workiz. Turn it on to get every user's time off as well " +
        "as the company's.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Time-off windows" },
  ],

  async execute(input, ctx) {
    const items = await new WorkizClient(ctx).json<TimeOff[]>("/TimeOff/get/", {
      query: { all: input.all },
    });
    return { items: items ?? [] };
  },
};

export default timeOffList;
