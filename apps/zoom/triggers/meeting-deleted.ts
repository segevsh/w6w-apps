import { zoomTrigger } from "../lib/events.ts";

export default zoomTrigger({
  key: "meeting-deleted",
  title: "Meeting Deleted",
  description: "Fires when a meeting is deleted. The run gets the meeting that was deleted.",
  event: "meeting.deleted",
  sampleObject: {
    "id": 1234567890,
    "uuid": "sample-meeting-uuid",
    "host_id": "sample-host-id",
    "topic": "Weekly sync",
  },
});
