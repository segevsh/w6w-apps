import { windowTrigger } from "../lib/triggers.ts";

export default windowTrigger({
  key: "event-started",
  title: "Event Started",
  description: "The run gets each calendar event as its start time passes.",
  edge: "start",
});
