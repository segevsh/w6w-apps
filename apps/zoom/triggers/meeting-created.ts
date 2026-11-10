import { zoomTrigger } from "../lib/events.ts";

export default zoomTrigger({
  key: "meeting-created",
  title: "Meeting Created",
  description:
    "Fires when a meeting is created by one of your app or account users. The run gets the meeting.",
  event: "meeting.created",
  sampleObject: {
    "id": 1234567890,
    "uuid": "sample-meeting-uuid",
    "host_id": "sample-host-id",
    "topic": "Weekly sync",
    "type": 2,
    "start_time": "2026-11-09T09:00:00Z",
    "duration": 30,
    "join_url": "https://zoom.us/j/1234567890",
  },
});
