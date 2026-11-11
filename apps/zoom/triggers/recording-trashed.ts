import { zoomTrigger } from "../lib/events.ts";

export default zoomTrigger({
  key: "recording-trashed",
  title: "Recording Trashed",
  description:
    "Fires when a cloud recording is moved to the trash. The run gets the recording that was trashed.",
  event: "recording.trashed",
  sampleObject: {
    "id": 1234567890,
    "uuid": "sample-meeting-uuid",
    "host_id": "sample-host-id",
    "topic": "Weekly sync",
  },
});
