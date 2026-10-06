import type { ActionDefinition } from "@w6w/types";
import { BeeminderClient, goalPath, mapDatapoint } from "../lib/client.ts";
import { SLUG, USERNAME } from "../lib/factories.ts";

interface Input {
  username?: string;
  slug: string;
  datapoints: unknown;
}

/** `POST /users/u/goals/g/datapoints/create_all.json` */
const createDatapoints: ActionDefinition<Input> = {
  key: "create-datapoints",
  type: "perform",
  resource: "datapoint",
  title: "Create Multiple Datapoints",
  description: "Add several datapoints to a goal in one call. Each needs at least a `value`; " +
    "`timestamp`, `daystamp`, `comment` and `requestid` are optional. On partial failure " +
    "Beeminder answers with separate `successes` and `errors` lists.",
  idempotent: false,
  params: [
    USERNAME,
    SLUG,
    {
      key: "datapoints",
      label: "Datapoints",
      type: "json",
      required: true,
      hint: 'Array like [{"timestamp":1343577600,"value":220.6,"comment":"x","requestid":"a1"}]. ' +
        "Give each a requestid to make a retry safe.",
    },
  ],
  output: [
    { key: "created", type: "array", label: "Created datapoints" },
    { key: "count", type: "number", label: "Number created" },
    { key: "errors", type: "array", label: "Per-datapoint errors (partial failure)" },
  ],

  async execute(input, ctx) {
    const list = typeof input.datapoints === "string"
      ? JSON.parse(input.datapoints)
      : input.datapoints;
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error("datapoints must be a non-empty array");
    }
    const { data } = await new BeeminderClient(ctx).request(
      `${goalPath(input.username, input.slug)}/datapoints/create_all.json`,
      // The reference's own example sends `datapoints` as a JSON string in a form field.
      { method: "POST", form: { datapoints: JSON.stringify(list) } },
    );
    // Success is a list; on any error the body is {successes, errors}.
    const ok = Array.isArray(data)
      ? data
      : (data as { successes?: unknown[] } | undefined)?.successes ?? [];
    const errors = Array.isArray(data) ? [] : (data as { errors?: unknown })?.errors ?? [];
    return { created: ok.map(mapDatapoint), count: ok.length, errors };
  },
};

export default createDatapoints;
