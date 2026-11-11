import { zoomTrigger } from "../lib/events.ts";

export default zoomTrigger({
  key: "user-deleted",
  title: "User Deleted",
  description:
    "Fires when a user is deleted from the account. The run gets the user that was deleted.",
  event: "user.deleted",
  sampleObject: { "id": "sample-user-id", "email": "ada@example.com" },
});
