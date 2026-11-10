import { webhookTrigger } from "../lib/triggers.ts";

/** A user updates their profile or their groups change (action `USER_UPDATE`). */
const userUpdated = webhookTrigger({
  key: "user-updated",
  title: "Member Updated",
  description:
    "Fires when a user updates their profile or the groups they are in change (action USER_UPDATE). The run gets the user's id; fetch the user for the new profile.",
  action: "USER_UPDATE",
  output: [{ key: "id", type: "string", label: "User ID" }],
  sample: { action: "USER_UPDATE", id: "e6ccb009-ad46-4b09-a6e9-1412d9ff0601" },
});

export default userUpdated;
