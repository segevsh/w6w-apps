import type { ActionDefinition } from "@w6w/types";
import { RedtailClient, unset } from "../lib/client.ts";
import type { RedtailActivity } from "../lib/types.ts";

interface Input {
  startDate?: string;
  endDate?: string;
}

interface Output {
  activities: RedtailActivity[];
}

/** `GET /activities?start_date=&end_date=` — the docs' own example URL names exactly these two filters. */
const activityList: ActionDefinition<Input, Output> = {
  key: "activity-list",
  type: "search",
  resource: "activity",
  title: "List Activities",
  description:
    "List scheduled activities (tasks, appointments, calls), optionally within a date range.",
  params: [
    { key: "startDate", label: "Start date", type: "date" },
    { key: "endDate", label: "End date", type: "date" },
  ],
  output: [{ key: "activities", type: "array", label: "Activities" }],

  async execute(input, ctx) {
    const res = await new RedtailClient(ctx).request<Output>("/activities", {
      query: { start_date: unset(input.startDate), end_date: unset(input.endDate) },
    });
    return { activities: res.data.activities ?? [] };
  },
};

export default activityList;
