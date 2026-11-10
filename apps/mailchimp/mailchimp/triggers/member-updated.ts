import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "member-updated",
  title: "Member Profile Updated",
  description:
    "Fires when a member's profile is updated. The run gets the member's ID, email address and merge fields.",
  event: "profile",
});
