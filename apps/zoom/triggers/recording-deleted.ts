import { zoomTrigger } from "../lib/events.ts";

export default zoomTrigger({
  key: "recording-deleted",
  title: "Recording Deleted",
  description:
    "Fires when a cloud recording is permanently deleted. The run gets the recording that was deleted.",
  event: "recording.deleted",
  sampleObject: {
    "id": 1234567890,
    "uuid": "sample-meeting-uuid",
    "host_id": "sample-host-id",
    "topic": "Weekly sync",
  },
});
