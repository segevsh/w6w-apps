import { zoomTrigger } from "../lib/events.ts";

export default zoomTrigger({
  key: "webinar-updated",
  title: "Webinar Updated",
  description:
    "Fires when a webinar is updated. The run gets the changed fields of the webinar and, in oldObject, their previous values.",
  event: "webinar.updated",
  sampleObject: {
    "id": 9876543210,
    "uuid": "sample-webinar-uuid",
    "topic": "Product launch (moved)",
    "start_time": "2026-11-12T17:00:00Z",
  },
});
