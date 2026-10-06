import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  unitId: number;
  userId?: number;
}

const unitGetProgress: ActionDefinition<Input> = {
  key: "unit-get-progress",
  type: "read",
  resource: "unit",
  title: "Get Unit Progress",
  description: "Status and score for every user who tried a unit, or for one user.",
  params: [
    { key: "unitId", label: "Unit ID", type: "number", required: true },
    { key: "userId", label: "User ID", type: "number" },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("getusersprogressinunits", {
      unit_id: input.unitId,
      user_id: input.userId,
    });
  },
};

export default unitGetProgress;
