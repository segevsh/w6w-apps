import type { ActionDefinition } from "@w6w/types";
import { USER, WakaClient } from "../lib/client.ts";

interface Input {
  date: string;
}

/** `GET /api/v1/users/current/heartbeats` */
const heartbeatsList: ActionDefinition<Input> = {
  key: "heartbeats-list",
  type: "read",
  resource: "heartbeat",
  title: "List Heartbeats",
  description: "The raw heartbeats the user's editor plugins sent for one day.",
  params: [
    {
      key: "date",
      label: "Date",
      type: "date",
      required: true,
      hint: "The day to read, as YYYY-MM-DD, in the user's timezone.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Heartbeats" },
    { key: "start", type: "string", label: "Start of the day (ISO 8601)" },
    { key: "end", type: "string", label: "End of the day (ISO 8601)" },
    { key: "timezone", type: "string", label: "Timezone used" },
  ],

  execute(input, ctx) {
    return new WakaClient(ctx).request("GET", `${USER}/heartbeats`, {
      query: {
        date: input.date,
      },
    });
  },
};

export default heartbeatsList;
