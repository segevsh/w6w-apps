import { zoomTrigger } from "../lib/events.ts";

export default zoomTrigger({
  key: "meeting-started",
  title: "Meeting Started",
  description: "Fires when a meeting starts. The run gets the meeting.",
  event: "meeting.started",
});
