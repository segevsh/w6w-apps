import { slackTrigger } from "../lib/triggers.ts";

/** A new message in any channel the Slack app is subscribed to (Events API `message.*`). */
const newMessage = slackTrigger({
  key: "new-message",
  title: "New Message",
  description:
    "Fires when someone posts a message in a channel the Slack app listens to. The run gets the channel, user, text and message timestamp.",
  kind: "message",
});

export default newMessage;
