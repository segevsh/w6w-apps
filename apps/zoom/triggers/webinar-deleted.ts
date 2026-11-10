import { zoomTrigger } from "../lib/events.ts";

export default zoomTrigger({
  key: "webinar-deleted",
  title: "Webinar Deleted",
  description: "Fires when a webinar is deleted. The run gets the webinar that was deleted.",
  event: "webinar.deleted",
  sampleObject: {
    "id": 9876543210,
    "uuid": "sample-webinar-uuid",
    "host_id": "sample-host-id",
    "topic": "Product launch",
  },
});
