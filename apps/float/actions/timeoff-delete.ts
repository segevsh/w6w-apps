import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `DELETE /v3/timeoffs/{timeoff_id}` — delete a time off record. */
interface Input {
  timeoff_id: number;
}

const timeoffDelete: ActionDefinition<Input> = {
  key: "timeoff-delete",
  type: "perform",
  resource: "timeoff",
  title: "Delete Time Off",
  description: "Delete a time off record.",
  idempotent: true,
  params: [idParam("timeoff_id", "Time off ID")],
  output: [],

  async execute(input, ctx) {
    await new FloatClient(ctx).remove(`/timeoffs/${input.timeoff_id}`);
    return { deleted: true, timeoff_id: input.timeoff_id };
  },
};

export default timeoffDelete;
