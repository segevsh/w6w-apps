import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "member-cleaned",
  title: "Member Cleaned",
  description:
    "Fires when an email address is cleaned from the audience. The run gets the audience ID and Mailchimp's event data for the address.",
  event: "cleaned",
  sampleData: { list_id: "a6b5da1054", email: "ada@example.com" },
});
