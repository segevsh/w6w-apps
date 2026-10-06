import type { ActionDefinition } from "@w6w/types";
import { USER, WakaClient } from "../lib/client.ts";

interface Input {
  project?: string;
}

/** `GET /api/v1/users/current/all_time_since_today` */
const allTimeGet: ActionDefinition<Input> = {
  key: "all-time-get",
  type: "read",
  resource: "stats",
  title: "Get All-Time Total",
  description:
    "Total time logged since the account was created, optionally for one project. Available on the free plan.",
  params: [
    {
      key: "project",
      label: "Project",
      type: "string",
      hint: "Total since this project was created.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Total (text, decimal, digital, total_seconds, range)" },
  ],

  execute(input, ctx) {
    return new WakaClient(ctx).request("GET", `${USER}/all_time_since_today`, {
      query: {
        project: input.project,
      },
    });
  },
};

export default allTimeGet;
