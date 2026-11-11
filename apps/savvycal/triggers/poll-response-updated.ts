import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "poll-response-updated",
  title: "Poll Response Updated",
  type: "poll.response.updated",
  description:
    "Fires when someone changes their response to a SavvyCal poll. The run gets the delivery; the response is in `data`.",
});
