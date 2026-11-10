import { windowTrigger } from "../lib/triggers.ts";

export default windowTrigger({
  key: "event-ended",
  title: "Event Ended",
  description: "The run gets each calendar event as its end time passes.",
  edge: "end",
});
