import type { ActionDefinition } from "@w6w/types";
import { BeeminderClient, userPath } from "../lib/client.ts";
import { USERNAME } from "../lib/factories.ts";

interface Input {
  username?: string;
  diffSince?: number;
  associations?: boolean;
  skinny?: boolean;
  emaciated?: boolean;
  datapointsCount?: number;
}

/** `GET /users/u.json` */
const getUser: ActionDefinition<Input> = {
  key: "get-user",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Read a user: username, timezone, last-update time, goal slugs and urgency load. " +
    "Use `updatedAt` to skip needless requests — it changes whenever any goal or datapoint does.",
  params: [
    USERNAME,
    {
      key: "associations",
      label: "Include all goals and datapoints",
      type: "boolean",
      hint: "Heavy; prefer `diffSince`.",
    },
    {
      key: "diffSince",
      label: "Changed since (unix seconds)",
      type: "number",
      hint: "Return only goals and datapoints created or updated since then. Implies associations.",
    },
    {
      key: "skinny",
      label: "Skinny",
      type: "boolean",
      hint: "With `diffSince`: a subset of goal attributes and only the latest datapoint.",
    },
    {
      key: "emaciated",
      label: "Strip road fields",
      type: "boolean",
      hint: "Drop the `road`, `roadall` and `fullroad` goal attributes.",
    },
    {
      key: "datapointsCount",
      label: "Datapoints per goal",
      type: "number",
      validation: { min: 0, integer: true },
      hint: "Only the n most recently updated datapoints.",
    },
  ],
  output: [
    { key: "username", type: "string", label: "Username" },
    { key: "timezone", type: "string", label: "Timezone" },
    { key: "updatedAt", type: "number", label: "Updated at (unix seconds)" },
    { key: "goals", type: "array", label: "Goal slugs (or goal objects with associations)" },
    { key: "deadbeat", type: "boolean", label: "Payment info out of date" },
    { key: "urgencyLoad", type: "number", label: "Urgency load" },
    { key: "deletedGoals", type: "array", label: "Deleted goal ids (with diffSince)" },
  ],

  async execute(input, ctx) {
    const { data } = await new BeeminderClient(ctx).request(`${userPath(input.username)}.json`, {
      query: {
        associations: input.associations,
        diff_since: input.diffSince,
        skinny: input.skinny,
        emaciated: input.emaciated,
        datapoints_count: input.datapointsCount,
      },
    });
    const u = (data ?? {}) as Record<string, unknown>;
    return {
      username: u.username,
      timezone: u.timezone,
      updatedAt: u.updated_at,
      goals: u.goals,
      deadbeat: u.deadbeat,
      urgencyLoad: u.urgency_load,
      deletedGoals: u.deleted_goals,
    };
  },
};

export default getUser;
