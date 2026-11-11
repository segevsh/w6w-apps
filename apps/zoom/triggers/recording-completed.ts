import { zoomTrigger } from "../lib/events.ts";

export default zoomTrigger({
  key: "recording-completed",
  title: "Recording Completed",
  description:
    "Fires when a meeting or webinar recording becomes available. The run gets the recording and its files; the 24-hour download token Zoom sends is not passed on.",
  event: "recording.completed",
  sampleObject: {
    "id": 1234567890,
    "uuid": "sample-meeting-uuid",
    "host_id": "sample-host-id",
    "topic": "Weekly sync",
    "recording_count": 1,
    "recording_files": [{
      "id": "sample-file-id",
      "file_type": "MP4",
      "download_url": "https://zoom.us/rec/download/sample",
    }],
  },
});
