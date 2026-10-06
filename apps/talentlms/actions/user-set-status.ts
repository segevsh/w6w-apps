import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  userId: number;
  status: string;
}

const userSetStatus: ActionDefinition<Input> = {
  key: "user-set-status",
  type: "perform",
  resource: "user",
  title: "Set User Status",
  description: "Activate or deactivate a user.",
  // Converges on the same end state when retried.
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "number", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }],
    },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("usersetstatus", {
      user_id: input.userId,
      status: input.status,
    });
  },
};

export default userSetStatus;
