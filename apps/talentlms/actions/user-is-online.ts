import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  userId: number;
}

const userIsOnline: ActionDefinition<Input> = {
  key: "user-is-online",
  type: "read",
  resource: "user",
  title: "Is User Online",
  description: "Check whether a user is currently logged in.",
  params: [
    { key: "userId", label: "User ID", type: "number", required: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("isuseronline", {
      user_id: input.userId,
    });
  },
};

export default userIsOnline;
