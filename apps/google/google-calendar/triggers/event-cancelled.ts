import { syncFeedTrigger } from "../lib/triggers.ts";

export default syncFeedTrigger({
  key: "event-cancelled",
  title: "Event Cancelled",
  description:
    "Polls a calendar's incremental sync feed. The run gets each event that was cancelled (deleted) since the last check.",
  only: "cancelled",
  hint: 'The calendar to watch. The first check emits nothing. "primary" is your main calendar.',
});
