import { webhookTrigger } from "../lib/triggers.ts";

/** A new user joins the community (action `USER_JOIN`). */
const userJoined = webhookTrigger({
  key: "user-joined",
  title: "New Member",
  description:
    "Fires when a new user joins the Heartbeat community (action USER_JOIN). The run gets the new member's id, name and email.",
  action: "USER_JOIN",
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: {
    action: "USER_JOIN",
    id: "e6ccb009-ad46-4b09-a6e9-1412d9ff0601",
    name: "Ada Lovelace",
    email: "ada@example.com",
  },
});

export default userJoined;
