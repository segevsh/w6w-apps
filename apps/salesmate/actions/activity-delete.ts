import type { ActionDefinition } from "@w6w/types";
import { SalesmateClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  activityId: number;
  hardDelete?: boolean;
}

const activityDelete: ActionDefinition<Input> = {
  key: "activity-delete",
  type: "perform",
  resource: "activity",
  title: "Delete Activity",
  description:
    "Delete a activity by id. Salesmate reports an unknown id as an ObjectNotFound error.",
  idempotent: false,
  params: [
    idParam("activityId", "Activity ID"),
    {
      key: "hardDelete",
      label: "Delete permanently",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "The reference sample sends hardDelete=false.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "number", label: "Activity ID" },
  ],

  async execute(input, ctx) {
    await new SalesmateClient(ctx).request(`/activity/v4/${input.activityId}`, {
      method: "DELETE",
      query: { hardDelete: input.hardDelete ?? false },
    });
    return { deleted: true, id: input.activityId };
  },
};

export default activityDelete;
