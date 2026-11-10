import { syncFeedTrigger } from "../lib/triggers.ts";

export default syncFeedTrigger({
  key: "new-event",
  title: "New Event",
  description:
    "Polls a calendar's incremental sync feed. The run gets each event that was newly created since the last check.",
  only: "created",
  hint: 'The calendar to watch. The first check emits nothing. "primary" is your main calendar.',
});
