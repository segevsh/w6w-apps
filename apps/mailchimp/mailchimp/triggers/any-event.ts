import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on the Mailchimp audience events you list (leave it empty for all six). The run gets the event and its data.",
});
