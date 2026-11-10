import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "member-unsubscribed",
  title: "Member Unsubscribed",
  description:
    "Fires when a member unsubscribes from the audience. The run gets the member, the action and the reason.",
  event: "unsubscribe",
  sampleData: {
    action: "unsub",
    reason: "manual",
    id: "8a25ff1d98",
    list_id: "a6b5da1054",
    email: "ada@example.com",
  },
});
