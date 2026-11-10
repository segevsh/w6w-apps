import { zoomTrigger } from "../lib/events.ts";

export default zoomTrigger({
  key: "webinar-ended",
  title: "Webinar Ended",
  description:
    "Fires when a webinar ends. The run gets the webinar, including its start and end times.",
  event: "webinar.ended",
  sampleObject: {
    "id": 9876543210,
    "uuid": "sample-webinar-uuid",
    "host_id": "sample-host-id",
    "topic": "Product launch",
    "start_time": "2026-11-12T16:00:00Z",
    "end_time": "2026-11-12T17:00:00Z",
  },
});
