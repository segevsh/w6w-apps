import type { ActionDefinition } from "@w6w/types";
import { RedtailClient } from "../lib/client.ts";

interface Input {
  activityId: number;
}

interface Output {
  deleted: boolean;
}

const activityDelete: ActionDefinition<Input, Output> = {
  key: "activity-delete",
  type: "perform",
  resource: "activity",
  title: "Delete Activity",
  description: "Delete an activity. Redtail answers 204 No Content on success.",
  idempotent: true,
  params: [
    { key: "activityId", label: "Activity ID", type: "number", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new RedtailClient(ctx).request(`/activities/${input.activityId}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default activityDelete;
