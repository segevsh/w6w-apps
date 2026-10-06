import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /api/v2/activities/{id}` — Fetch one activity (to-do or phone call) by ID. */
interface Input {
  id: number;
}

const activityGet: ActionDefinition<Input> = {
  key: "activity-get",
  type: "read",
  resource: "activity",
  title: "Get Activity",
  description: "Fetch one activity (to-do or phone call) by ID.",
  params: [idParam("id", "Activity ID")],
  output: [{ key: "data", type: "object", label: "The activity" }],

  async execute(input, ctx) {
    const data = await new UpsalesClient(ctx).data("GET", `/activities/${encodeId(input.id)}`);
    return { data };
  },
};

export default activityGet;
