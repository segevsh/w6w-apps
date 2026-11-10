import { zoomTrigger } from "../lib/events.ts";

export default zoomTrigger({
  key: "webinar-started",
  title: "Webinar Started",
  description: "Fires when a webinar starts. The run gets the webinar.",
  event: "webinar.started",
  sampleObject: {
    "id": 9876543210,
    "uuid": "sample-webinar-uuid",
    "host_id": "sample-host-id",
    "topic": "Product launch",
    "start_time": "2026-11-12T16:00:00Z",
  },
});
