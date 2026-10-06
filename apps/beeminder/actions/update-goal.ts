import type { ActionDefinition } from "@w6w/types";
import { BeeminderClient, defined, goalPath, mapGoal, splitList } from "../lib/client.ts";
import { GOAL_OUTPUT, SLUG, USERNAME } from "../lib/factories.ts";

interface Input {
  username?: string;
  slug: string;
  title?: string;
  yaxis?: string;
  tmin?: string;
  tmax?: string;
  secret?: boolean;
  datapublic?: boolean;
  roadall?: unknown;
  datasource?: string;
  tags?: string;
}

/** `PUT /users/u/goals/g.json` */
const updateGoal: ActionDefinition<Input> = {
  key: "update-goal",
  type: "perform",
  resource: "goal",
  title: "Update Goal",
  description: "Update a goal's title, y-axis label, x-axis bounds, visibility, data source, " +
    "tags or bright red line (`roadall`). The goal type cannot be changed, and a change that " +
    "makes the goal easier before the akrasia horizon is refused by Beeminder.",
  idempotent: true,
  params: [
    USERNAME,
    SLUG,
    { key: "title", label: "Title", type: "string" },
    { key: "yaxis", label: "Y-axis label", type: "string" },
    { key: "tmin", label: "X-min (yyyy-mm-dd)", type: "string" },
    { key: "tmax", label: "X-max (yyyy-mm-dd)", type: "string" },
    { key: "secret", label: "Secret", type: "boolean" },
    { key: "datapublic", label: "Public datapoints", type: "boolean" },
    {
      key: "roadall",
      label: "Bright red line (roadall)",
      type: "json",
      hint: "Array of [date, value, rate] rows with exactly one null each, taken from a goal's " +
        "`roadall` (not `road`). First row is [date, value, null]; only the last row may start with null.",
    },
    {
      key: "datasource",
      label: "Data source",
      type: "string",
      hint: 'One of "api", "ifttt", "zapier", or your client name. Empty string returns to manual.',
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma separated. REPLACES the goal's tags; an empty string removes them all.",
    },
  ],
  output: GOAL_OUTPUT,

  async execute(input, ctx) {
    const { data } = await new BeeminderClient(ctx).request(
      `${goalPath(input.username, input.slug)}.json`,
      {
        method: "PUT",
        json: defined({
          title: input.title,
          yaxis: input.yaxis,
          tmin: input.tmin,
          tmax: input.tmax,
          secret: input.secret,
          datapublic: input.datapublic,
          roadall: typeof input.roadall === "string" && input.roadall.trim()
            ? JSON.parse(input.roadall)
            : input.roadall || undefined,
          datasource: input.datasource,
          tags: input.tags === undefined ? undefined : splitList(input.tags),
        }),
      },
    );
    return mapGoal(data);
  },
};

export default updateGoal;
