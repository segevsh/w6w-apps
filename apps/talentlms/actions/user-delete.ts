import type { ActionDefinition } from "@w6w/types";
import { flag, TalentLmsClient } from "../lib/client.ts";

interface Input {
  userId: number;
  deletedByUserId?: number;
  permanent?: boolean;
}

const userDelete: ActionDefinition<Input> = {
  key: "user-delete",
  type: "perform",
  resource: "user",
  title: "Delete User",
  description: "Delete a user, optionally permanently.",
  // Converges on the same end state when retried.
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "number", required: true },
    {
      key: "deletedByUserId",
      label: "Deleted by user ID",
      type: "number",
      advanced: true,
      hint: "Defaults to the account's super-administrator.",
    },
    { key: "permanent", label: "Delete permanently", type: "boolean", advanced: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).post("deleteuser", {
      user_id: input.userId,
      deleted_by_user_id: input.deletedByUserId,
      permanent: flag(input.permanent, "yes", "no"),
    });
  },
};

export default userDelete;
