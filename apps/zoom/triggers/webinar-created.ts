import { zoomTrigger } from "../lib/events.ts";

export default zoomTrigger({
  key: "webinar-created",
  title: "Webinar Created",
  description: "Fires when a webinar is created. The run gets the webinar.",
  event: "webinar.created",
  sampleObject: {
    "id": 9876543210,
    "uuid": "sample-webinar-uuid",
    "host_id": "sample-host-id",
    "topic": "Product launch",
    "type": 5,
    "start_time": "2026-11-12T16:00:00Z",
  },
});
