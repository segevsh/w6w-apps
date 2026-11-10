import { zoomTrigger } from "../lib/events.ts";

export default zoomTrigger({
  key: "meeting-ended",
  title: "Meeting Ended",
  description:
    "Fires when a meeting ends. The run gets the meeting, including its start and end times.",
  event: "meeting.ended",
  sampleObject: {
    "id": 1234567890,
    "uuid": "sample-meeting-uuid",
    "host_id": "sample-host-id",
    "topic": "Weekly sync",
    "start_time": "2026-11-09T09:00:00Z",
    "end_time": "2026-11-09T09:30:00Z",
  },
});
