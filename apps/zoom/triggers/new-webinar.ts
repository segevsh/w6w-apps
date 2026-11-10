import webinarGetMany from "../actions/webinar-get-many.ts";
import { snapshotTrigger } from "../lib/lists.ts";

/** `GET /users/{userId}/webinars`: only a user's unexpired webinars. */
export default snapshotTrigger<{ userId?: string }>({
  key: "new-webinar",
  title: "New Webinar",
  description:
    "The run gets each webinar newly on a user's webinar list (checked on a schedule). For an instant reaction, use Webinar Created.",
  params: [{
    key: "userId",
    label: "User",
    type: "string",
    default: "me",
    hint: "Zoom user id or email whose webinars to watch; `me` is the connected account.",
  }],
  output: [
    { key: "id", type: "number", label: "Webinar ID" },
    { key: "uuid", type: "string", label: "Webinar UUID" },
    { key: "topic", type: "string", label: "Topic" },
    { key: "type", type: "number", label: "Type" },
    { key: "start_time", type: "string", label: "Start time" },
    { key: "duration", type: "number", label: "Duration (minutes)" },
    { key: "join_url", type: "string", label: "Join URL" },
  ],
  sample: {
    id: 9876543210,
    uuid: "sample-webinar-uuid",
    host_id: "sample-host-id",
    topic: "Product launch",
    type: 5,
    start_time: "2026-11-12T16:00:00Z",
    duration: 60,
    join_url: "https://zoom.us/j/9876543210",
  },
  action: webinarGetMany,
  input: ({ userId }) => ({ userId: userId?.trim() || "me" }),
  rows: "webinars",
  idOf: (row) => row.id,
  noun: "webinars",
});
