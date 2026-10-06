import type { ActionDefinition } from "@w6w/types";
import { USER, WakaClient } from "../lib/client.ts";

interface Input {
  date: string;
  project?: string;
  branches?: string;
  timezone?: string;
}

/** `GET /api/v1/users/current/external_durations` */
const externalDurationsList: ActionDefinition<Input> = {
  key: "external-durations-list",
  type: "read",
  resource: "external-duration",
  title: "List External Durations",
  description:
    "A day's external durations: time logged by apps other than editor plugins, such as calendar meetings.",
  params: [
    {
      key: "date",
      label: "Date",
      type: "date",
      required: true,
      hint: "The day to read, as YYYY-MM-DD, in the user's timezone.",
    },
    { key: "project", label: "Project", type: "string", hint: "Only this project's data." },
    { key: "branches", label: "Branches", type: "string", hint: "Comma-separated branch names." },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      hint: "Olson name, e.g. Europe/Berlin. Defaults to the user's timezone.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "External durations" },
  ],

  execute(input, ctx) {
    return new WakaClient(ctx).request("GET", `${USER}/external_durations`, {
      query: {
        date: input.date,
        project: input.project,
        branches: input.branches,
        timezone: input.timezone,
      },
    });
  },
};

export default externalDurationsList;
