import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "poll-response-created",
  title: "Poll Response Created",
  type: "poll.response.created",
  description:
    "Fires when someone responds to a SavvyCal poll. The run gets the delivery; the response (name, email, slots, poll) is in `data`.",
});
