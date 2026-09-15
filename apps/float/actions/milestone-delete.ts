import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `DELETE /v3/milestones/{milestone_id}` — delete a milestone. */
interface Input {
  milestone_id: number;
}

const milestoneDelete: ActionDefinition<Input> = {
  key: "milestone-delete",
  type: "perform",
  resource: "milestone",
  title: "Delete Milestone",
  description: "Delete a milestone.",
  idempotent: true,
  params: [idParam("milestone_id", "Milestone ID")],
  output: [],

  async execute(input, ctx) {
    await new FloatClient(ctx).remove(`/milestones/${input.milestone_id}`);
    return { deleted: true, milestone_id: input.milestone_id };
  },
};

export default milestoneDelete;
