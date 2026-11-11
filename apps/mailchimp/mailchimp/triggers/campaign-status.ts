import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "campaign-status",
  title: "Campaign Sent",
  description:
    "Fires when a campaign finishes sending. The run gets the audience ID and Mailchimp's event data for the campaign.",
  event: "campaign",
  sampleData: { id: "5aa2102003", list_id: "a6b5da1054" },
});
