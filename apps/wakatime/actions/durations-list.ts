import type { ActionDefinition } from "@w6w/types";
import { USER, WakaClient } from "../lib/client.ts";

interface Input {
  date: string;
  project?: string;
  branches?: string;
  timeout?: number;
  writesOnly?: boolean;
  timezone?: string;
  sliceBy?: string;
}

/** `GET /api/v1/users/current/durations` */
const durationsList: ActionDefinition<Input> = {
  key: "durations-list",
  type: "read",
  resource: "duration",
  title: "List Durations",
  description:
    "A day's coding activity as durations: contiguous blocks of heartbeats joined within the keystroke timeout, sliced by project or another key.",
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
      key: "timeout",
      label: "Keystroke timeout (minutes)",
      type: "number",
      hint: "Defaults to the user's own setting.",
      validation: { min: 1, integer: true },
    },
    {
      key: "writesOnly",
      label: "Writes only",
      type: "boolean",
      hint: "Count only file writes. Defaults to the user's own setting.",
    },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      hint: "Olson name, e.g. Europe/Berlin. Defaults to the user's timezone.",
    },
    {
      key: "sliceBy",
      label: "Slice by",
      type: "select",
      hint: "Primary key durations are split on. Defaults to project.",
      options: [
        "project",
        "entity",
        "language",
        "dependencies",
        "os",
        "editor",
        "category",
        "machine",
      ].map((v) => ({ value: v, label: v })),
    },
  ],
  output: [
    { key: "data", type: "array", label: "Durations" },
    { key: "start", type: "string", label: "Start of the day (ISO 8601)" },
    { key: "end", type: "string", label: "End of the day (ISO 8601)" },
    { key: "timezone", type: "string", label: "Timezone used" },
  ],

  execute(input, ctx) {
    return new WakaClient(ctx).request("GET", `${USER}/durations`, {
      query: {
        date: input.date,
        project: input.project,
        branches: input.branches,
        timeout: input.timeout,
        writes_only: input.writesOnly,
        timezone: input.timezone,
        slice_by: input.sliceBy,
      },
    });
  },
};

export default durationsList;
