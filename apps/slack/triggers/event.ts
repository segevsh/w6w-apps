import { slackTrigger } from "../lib/triggers.ts";

/** Any Events API event the app is subscribed to, optionally narrowed to some event types. */
const event = slackTrigger({
  key: "event",
  title: "Slack Event",
  description:
    "Fires on any Slack Events API event the app is subscribed to (reactions, channels, members, files and more). The run gets the event type and the raw event.",
  kind: "event",
});

export default event;
