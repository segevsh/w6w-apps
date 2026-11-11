import meetingGetMany from "../actions/meeting-get-many.ts";
import { snapshotTrigger } from "../lib/lists.ts";

/** `GET /users/{userId}/meetings?type=scheduled`: only a user's unexpired scheduled meetings. */
export default snapshotTrigger<{ userId?: string }>({
  key: "new-meeting",
  title: "New Meeting",
  description:
    "The run gets each scheduled meeting newly on a user's meeting list (checked on a schedule). For an instant reaction, use Meeting Created.",
  params: [{
    key: "userId",
    label: "User",
    type: "string",
    default: "me",
    hint: "Zoom user id or email whose meetings to watch; `me` is the connected account.",
  }],
  output: [
    { key: "id", type: "number", label: "Meeting ID" },
    { key: "uuid", type: "string", label: "Meeting UUID" },
    { key: "topic", type: "string", label: "Topic" },
    { key: "type", type: "number", label: "Type" },
    { key: "start_time", type: "string", label: "Start time" },
    { key: "duration", type: "number", label: "Duration (minutes)" },
    { key: "join_url", type: "string", label: "Join URL" },
  ],
  sample: {
    id: 1234567890,
    uuid: "sample-meeting-uuid",
    host_id: "sample-host-id",
    topic: "Weekly sync",
    type: 2,
    start_time: "2026-11-09T09:00:00Z",
    duration: 30,
    join_url: "https://zoom.us/j/1234567890",
  },
  action: meetingGetMany,
  input: ({ userId }) => ({ userId: userId?.trim() || "me", type: "scheduled" }),
  rows: "meetings",
  idOf: (row) => row.id,
  noun: "meetings",
});
