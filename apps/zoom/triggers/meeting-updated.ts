import { zoomTrigger } from "../lib/events.ts";

export default zoomTrigger({
  key: "meeting-updated",
  title: "Meeting Updated",
  description:
    "Fires when a scheduled meeting is updated. The run gets the changed fields of the meeting and, in oldObject, their previous values.",
  event: "meeting.updated",
  sampleObject: {
    "id": 1234567890,
    "uuid": "sample-meeting-uuid",
    "host_id": "sample-host-id",
    "topic": "Weekly sync (moved)",
    "start_time": "2026-11-09T10:00:00Z",
  },
});
