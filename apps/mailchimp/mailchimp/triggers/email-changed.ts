import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "email-changed",
  title: "Member Email Changed",
  description:
    "Fires when a member changes their email address. The run gets the audience ID and Mailchimp's event data for the change.",
  event: "upemail",
  sampleData: { list_id: "a6b5da1054" },
});
