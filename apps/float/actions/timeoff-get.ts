import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /v3/timeoffs/{timeoff_id}` — retrieve a single time off record. */
interface Input {
  timeoff_id: number;
}

const timeoffGet: ActionDefinition<Input> = {
  key: "timeoff-get",
  type: "read",
  resource: "timeoff",
  title: "Get Time Off",
  description: "Retrieve a single time off record by ID.",
  params: [idParam("timeoff_id", "Time off ID")],
  output: [
    { key: "timeoff_id", type: "number", label: "Time off ID" },
    { key: "people_ids", type: "array", label: "People assigned" },
  ],

  async execute(input, ctx) {
    return await new FloatClient(ctx).json(`/timeoffs/${input.timeoff_id}`);
  },
};

export default timeoffGet;
