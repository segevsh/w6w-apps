import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "member-subscribed",
  title: "Member Subscribed",
  description:
    "Fires when someone subscribes to the audience. The run gets the member's ID, email address and merge fields.",
  event: "subscribe",
});
