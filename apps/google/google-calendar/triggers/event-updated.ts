import { syncFeedTrigger } from "../lib/triggers.ts";

export default syncFeedTrigger({
  key: "event-updated",
  title: "Event Updated",
  description:
    "Polls a calendar's incremental sync feed. The run gets each existing event that was edited since the last check.",
  only: "updated",
  hint: 'The calendar to watch. The first check emits nothing. "primary" is your main calendar.',
});
