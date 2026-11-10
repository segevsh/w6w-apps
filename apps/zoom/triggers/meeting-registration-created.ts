import { zoomTrigger } from "../lib/events.ts";

export default zoomTrigger({
  key: "meeting-registration-created",
  title: "Meeting Registration Created",
  description:
    "Fires when someone registers for a meeting. The run gets the meeting and the registrant.",
  event: "meeting.registration_created",
  sampleObject: {
    "id": 1234567890,
    "uuid": "sample-meeting-uuid",
    "host_id": "sample-host-id",
    "topic": "Weekly sync",
    "registrant": { "id": "sample-registrant-id", "email": "ada@example.com", "first_name": "Ada" },
  },
});
